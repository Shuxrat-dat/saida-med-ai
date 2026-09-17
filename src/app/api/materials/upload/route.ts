import { NextRequest, NextResponse } from "next/server";
import { DocumentParser } from "@/lib/parsers/document-parser";
import { SemanticChunker } from "@/lib/parsers/chunker";
import { DocumentAnalyzer } from "@/lib/ai/document-analyzer";
import { QuestionGenerator } from "@/lib/ai/question-generator";
import { MedicalRepository } from "@/lib/db/repository";
import { getStorageService, generateDocumentStoragePath } from "@/lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const materials = await MedicalRepository.getMaterials();
    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (error: any) {
    console.error("GET materials error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось загрузить список материалов" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subject = (formData.get("subject") as string) || "Общая медицина";

    if (!file) {
      return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
    }

    const filename = file.name;
    const fileSize = file.size;
    const mimeType = file.type;

    // Проверка размера (максимум 50 МБ)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Размер файла превышает лимит 50 МБ" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Parse document with page metadata & OCR fallback
    const extractedDoc = await DocumentParser.parseFile(buffer, filename, mimeType);

    // 2. Semantic Chunking
    const chunks = SemanticChunker.chunkPages(extractedDoc.pages);

    // 3. AI Structured Analysis
    const analysis = await DocumentAnalyzer.analyzeDocument(extractedDoc.title, chunks);

    const materialId = `mat-${Date.now()}`;

    // 4. Загрузка файла документа в хранилище (Local или Supabase Storage)
    const storage = getStorageService();
    const storagePath = generateDocumentStoragePath(materialId, filename);
    let uploadedFile = {
      url: `/uploads/${filename}`,
      path: `materials/${materialId}/${filename}`,
    };

    try {
      const uploadResult = await storage.uploadFile({
        path: storagePath,
        buffer,
        contentType: mimeType || "application/octet-stream",
      });
      uploadedFile = {
        url: uploadResult.url,
        path: uploadResult.path,
      };
    } catch (storageErr: any) {
      console.error(`[Storage Error] Failed to upload document to ${storage.name}:`, storageErr?.message || storageErr);
      if ((process.env.STORAGE_TYPE || "").toLowerCase().trim() === "supabase") {
        throw new Error(`Ошибка сохранения файла в Supabase Storage: ${storageErr?.message || "Неизвестная ошибка"}`);
      }
    }

    // 5. Генерация проверочных вопросов
    let generatedQuestions: any[] = [];
    try {
      const primaryTopicName = analysis.topics[0]?.name || "Ключевые темы материала";
      generatedQuestions = await QuestionGenerator.generateQuestions({
        materialTitle: filename,
        topicName: primaryTopicName,
        chunks,
        count: 5,
      });
    } catch (qErr) {
      console.warn("Could not pre-generate questions for upload:", qErr);
    }

    // 6. Сохранение материала, страниц, тем, понятий, карточек и вопросов напрямую в PostgreSQL
    const isImageFile = ["jpg", "jpeg", "png", "webp"].includes(extractedDoc.fileType.toLowerCase());
    const savedMaterial = await MedicalRepository.createMaterial({
      id: materialId,
      title: filename,
      subject: analysis.subject || subject,
      fileType: extractedDoc.fileType,
      fileUrl: uploadedFile.url,
      fileKey: uploadedFile.path,
      fileSize,
      pageCount: extractedDoc.pageCount,
      status: "READY",
      summary: analysis.summary,
      pages: extractedDoc.pages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        imageUrl: p.imageUrl || (isImageFile && p.pageNumber === 1 ? uploadedFile.url : undefined),
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
      extractedPagesCount: extractedDoc.pageCount,
      chunksCount: chunks.length,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось обработать документ" },
      { status: 500 }
    );
  }
}
