import { NextRequest, NextResponse } from "next/server";
import { DocumentParser, BatchImageItem } from "@/lib/parsers/document-parser";
import { SemanticChunker } from "@/lib/parsers/chunker";
import { DocumentAnalyzer } from "@/lib/ai/document-analyzer";
import { QuestionGenerator } from "@/lib/ai/question-generator";
import { MedicalRepository } from "@/lib/db/repository";
import { prisma } from "@/lib/db/prisma";
import { getStorageService, generatePageStoragePath } from "@/lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const subject = (formData.get("subject") as string) || "Общая медицина";
    const customTitle = (formData.get("title") as string)?.trim();
    const pagesCount = parseInt((formData.get("pagesCount") as string) || "0", 10);

    if (pagesCount <= 0) {
      return NextResponse.json(
        { error: "Не передано ни одной фотографии для распознавания" },
        { status: 400 }
      );
    }

    const batchItems: BatchImageItem[] = [];
    let totalBytes = 0;

    for (let i = 1; i <= pagesCount; i++) {
      const file = formData.get(`page_${i}`) as File | null;
      if (!file) continue;

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `Файл страницы ${i} не является изображением (получен тип: ${file.type})` },
          { status: 400 }
        );
      }

      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Размер страницы ${i} превышает лимит 20 МБ` },
          { status: 400 }
        );
      }

      totalBytes += file.size;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      batchItems.push({
        buffer,
        filename: file.name || `page_${i}.jpg`,
        mimeType: file.type || "image/jpeg",
        pageNumber: i,
      });
    }

    if (batchItems.length === 0) {
      return NextResponse.json(
        { error: "Не удалось прочитать загруженные снимки страниц" },
        { status: 400 }
      );
    }

    // 1. Постраничный медицинский OCR через DocumentParser
    const extractedDoc = await DocumentParser.parseImagesBatch(batchItems, customTitle);

    // 2. Семантическое чанкование по 350 слов с сохранением pageNumber
    const chunks = SemanticChunker.chunkPages(extractedDoc.pages);

    // 3. AI-анализ структуры, понятий и фактов с точными номерами страниц
    const analysis = await DocumentAnalyzer.analyzeDocument(extractedDoc.title, chunks);

    // 4. Автоматическая подготовка проверочных вопросов по материалу
    let generatedQuestions: any[] = [];
    try {
      const primaryTopicName = analysis.topics[0]?.name || "Ключевые темы сфотографированного материала";
      generatedQuestions = await QuestionGenerator.generateQuestions({
        materialTitle: customTitle || extractedDoc.title,
        topicName: primaryTopicName,
        chunks,
        count: 5,
      });
    } catch (qErr) {
      console.warn("Could not pre-generate questions for camera scan:", qErr);
    }

    // 5. Загрузка исходных изображений страниц в хранилище (Local или Supabase Storage)
    const materialId = `mat-cam-${Date.now()}`;
    const storage = getStorageService();
    const pageUrlMap = new Map<number, { url: string; path: string }>();

    for (const item of batchItems) {
      try {
        const ext = item.filename.split(".").pop() || "jpg";
        const storagePath = generatePageStoragePath(materialId, item.pageNumber, ext);
        const result = await storage.uploadFile({
          path: storagePath,
          buffer: item.buffer,
          contentType: item.mimeType || "image/jpeg",
        });
        pageUrlMap.set(item.pageNumber, { url: result.url, path: result.path });
      } catch (uploadErr: any) {
        console.error(`[Storage Error] Failed to upload page ${item.pageNumber} to ${storage.name}:`, uploadErr?.message || uploadErr);
        if ((process.env.STORAGE_TYPE || "").toLowerCase().trim() === "supabase") {
          throw new Error(`Ошибка сохранения фото страницы ${item.pageNumber} в Supabase Storage: ${uploadErr?.message || "Неизвестная ошибка"}`);
        }
      }
    }

    // Привязываем реальные URL изображений страниц из хранилища
    const enrichedPages = extractedDoc.pages.map((p) => {
      const uploadInfo = pageUrlMap.get(p.pageNumber);
      return {
        ...p,
        imageUrl: uploadInfo?.url || p.imageUrl,
      };
    });

    const firstPageUpload = pageUrlMap.get(1) || (pageUrlMap.values().next().value as { url: string; path: string } | undefined);

    // 6. Сохранение материала, страниц, тем, понятий, карточек и вопросов в PostgreSQL
    const savedMaterial = await MedicalRepository.createMaterial({
      id: materialId,
      title: customTitle || extractedDoc.title,
      subject: analysis.subject || subject,
      fileType: "camera_scan",
      fileUrl: firstPageUpload?.url || `/uploads/scans/${materialId}.jpg`,
      fileKey: firstPageUpload?.path || `materials/${materialId}/scan`,
      fileSize: totalBytes,
      pageCount: extractedDoc.pageCount,
      status: "READY",
      summary: analysis.summary,
      pages: enrichedPages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        imageUrl: p.imageUrl,
        qualityScore: 1.0,
      })),
      topics: analysis.topics,
      questions: generatedQuestions.map((g) => ({
        prompt: g.prompt,
        type: g.type,
        difficulty: g.difficulty,
        options: g.options,
        correctAnswer: g.correctAnswer,
        explanation: g.explanation,
        distractorRationale: g.distractorRationale,
        sourceExcerpt: g.sourceExcerpt,
        sourcePage: g.sourcePage || 1,
      })),
    });

    return NextResponse.json({
      success: true,
      material: savedMaterial,
      analysis,
      pages: enrichedPages,
      pageAssessments: extractedDoc.pageAssessments,
    });
  } catch (error: any) {
    console.error("Camera upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Ошибка обработки снимков с камеры" },
      { status: 500 }
    );
  }
}
