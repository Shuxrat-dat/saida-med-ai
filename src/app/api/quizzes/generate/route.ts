import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { MedicalRepository, getDefaultUser } from "@/lib/db/repository";
import { QuestionGenerator, MistakeContext } from "@/lib/ai/question-generator";
import { prepareQuestionOptions } from "@/lib/quiz/shuffle";
import { createVerificationToken } from "@/lib/quiz/security";
import { SemanticChunk } from "@/lib/parsers/types";
import { getActiveAIConfig } from "@/lib/ai/client";

const GenerateQuizInput = z.object({
  materialId: z.string().optional(),
  topicId: z.string().optional(),
  mode: z.enum(["PRACTICE", "EXAM", "WEAK_TOPICS", "REVIEW_WEAK", "DUE_TODAY"]).default("PRACTICE"),
  count: z.number().int().min(1).max(40).default(5),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).default("MEDIUM"),
  excludeQuestionIds: z.array(z.string()).default([]),
  previousMistakes: z
    .array(
      z.object({
        conceptName: z.string(),
        userAnswer: z.string(),
        correctAnswer: z.string(),
        whyWrong: z.string().optional(),
        questionId: z.string().optional(),
      })
    )
    .default([]),
  focusTopicIds: z.array(z.string()).default([]),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Safe diagnostics — never logs the key itself
    const aiConfig = getActiveAIConfig();
    console.log("[/quizzes/generate] AI config:", {
      provider: aiConfig.provider,
      model: aiConfig.model,
      openaiKeyPresent:
        !!process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY.length > 20 &&
        !process.env.OPENAI_API_KEY.includes("[YOUR"),
      openaiKeyLength: process.env.OPENAI_API_KEY?.length ?? 0,
    });

    const body = await req.json();
    const parsed = GenerateQuizInput.safeParse(body);
    if (!parsed.success) {
      console.error("[API] /quizzes/generate validation:", parsed.error.issues);
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const {
      materialId,
      topicId,
      mode,
      count,
      difficulty,
      excludeQuestionIds = [],
      previousMistakes = [],
      focusTopicIds = [],
    } = parsed.data;

    const user = await getDefaultUser();
    let targetMaterialId = materialId;
    let targetTopicId = topicId;
    let finalFocusTopicIds: string[] = [...focusTopicIds];

    if (mode === "WEAK_TOPICS" || mode === "REVIEW_WEAK" || mode === "DUE_TODAY") {
      const weak = await MedicalRepository.getWeakTopics();
      const due = await MedicalRepository.getTopicsDueForReview();
      if (mode === "DUE_TODAY") {
        finalFocusTopicIds = due.map((t) => t.id);
      } else {
        finalFocusTopicIds = Array.from(
          new Set([...weak.map((t) => t.id), ...due.map((t) => t.id), ...focusTopicIds])
        );
      }
      if (finalFocusTopicIds.length === 0) {
        const allTopics = await MedicalRepository.getTopicsByMaterial(materialId || undefined);
        finalFocusTopicIds = allTopics.slice(0, 3).map((t) => t.id);
      }
    } else if (topicId) {
      finalFocusTopicIds = [topicId];
    }

    const userAnsweredQuestionIds = await prisma.quizQuestion.findMany({
      where: { quiz: { userId: user.id }, answeredAt: { not: null } },
      select: { questionId: true },
      take: 500,
      orderBy: { answeredAt: "desc" },
    });
    const excludeUnion = Array.from(
      new Set([...excludeQuestionIds, ...userAnsweredQuestionIds.map((r) => r.questionId)])
    );

    let existingQuestions = await MedicalRepository.getQuestions({
      materialId: materialId || undefined,
      topicId: topicId || undefined,
      weakOnly: mode === "WEAK_TOPICS" || mode === "REVIEW_WEAK",
      limit: Math.max(count * 2, 20),
    });

    if (finalFocusTopicIds.length > 0 && !topicId && !materialId) {
      const byTopic = await MedicalRepository.getQuestions({
        limit: count * 3,
      });
      existingQuestions = byTopic.filter((q) => finalFocusTopicIds.includes(q.topicId));
    }

    const existingById = new Map(existingQuestions.map((q) => [q.id, q]));
    for (const exId of excludeUnion) existingById.delete(exId);
    let selected = Array.from(existingById.values());

    const needGenerate = count - selected.length;
    let targetMasteryLevel = 1;

    if (needGenerate > 0) {
      const material = targetMaterialId
        ? await MedicalRepository.getMaterialById(targetMaterialId)
        : null;

      let targetTopicName = "Клинические концепции";
      if (targetTopicId) {
        const t = await prisma.topic.findUnique({ where: { id: targetTopicId }, select: { name: true } });
        if (t) targetTopicName = t.name;
      } else if (finalFocusTopicIds[0]) {
        const t = await prisma.topic.findUnique({ where: { id: finalFocusTopicIds[0] }, select: { name: true } });
        if (t) targetTopicName = t.name;
      }

      let masterDbPerf: { masteryLevel?: number } | null = null;
      if (finalFocusTopicIds[0]) {
        masterDbPerf = await prisma.topicPerformance.findUnique({
          where: { userId_topicId: { userId: user.id, topicId: finalFocusTopicIds[0] } },
          select: { masteryLevel: true },
        });
      }
      targetMasteryLevel = masterDbPerf?.masteryLevel ?? 1;

      let chunks: SemanticChunk[] = [];
      if (targetMaterialId) {
        const dbChunks = await prisma.documentChunk.findMany({
          where: { materialId: targetMaterialId },
          orderBy: { pageNumber: "asc" },
          take: 12,
        });
        chunks = dbChunks.map<SemanticChunk>((c, i) => ({
          chunkIndex: c.chunkIndex ?? i,
          pageNumber: c.pageNumber,
          sectionTitle: c.sectionTitle || undefined,
          content: c.content,
          tokenCount: c.tokenCount || Math.ceil(c.content.length / 4),
        }));
      }
      if (chunks.length === 0 && material?.pages && material.pages.length > 0) {
        chunks = material.pages.slice(0, 8).map<SemanticChunk>((p, i) => ({
          chunkIndex: i,
          pageNumber: p.pageNumber,
          sectionTitle: `Страница ${p.pageNumber}`,
          content: p.text,
          tokenCount: Math.ceil(p.text.length / 4),
        }));
      }
      if (chunks.length === 0) {
        chunks = [
          {
            chunkIndex: 0,
            pageNumber: 1,
            sectionTitle: "Медицинский разбор темы",
            content: `Тема: ${targetTopicName}. Общие принципы патофизиологии и диагностики данного состояния согласно учебным рекомендациям.`,
            tokenCount: 30,
          },
        ];
      }

      const excludePrompts = existingQuestions.map((q) => q.prompt);

      const mistakeCtx: MistakeContext[] = previousMistakes;
      const generated = await QuestionGenerator.generateQuestions({
        materialTitle: material?.title || "Medical Lecture Curriculum",
        topicName: targetTopicName,
        chunks,
        count: needGenerate,
        difficulty: difficulty as any,
        previousMistakes: mistakeCtx,
        targetMasteryLevel,
        excludePrompts,
      });

      if (!targetMaterialId || !targetTopicId) {
        const existingMaterials = material ? [material] : await MedicalRepository.getMaterials();
        if (existingMaterials.length > 0) {
          const firstMat = existingMaterials[0];
          targetMaterialId = targetMaterialId || firstMat.id;
          const matTopics = await MedicalRepository.getTopicsByMaterial(firstMat.id);
          if (matTopics.length > 0 && !targetTopicId) {
            targetTopicId = targetTopicId || finalFocusTopicIds[0] || matTopics[0].id;
          }
        }
      }

      for (const g of generated) {
        const questionData = {
          id: `q-dyn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          materialId: targetMaterialId || "mat-general",
          materialTitle: material?.title || "Медицинский материал",
          topicId: targetTopicId || "top-general",
          topicName: g.topicName || targetTopicName,
          type: g.type,
          difficulty: g.difficulty,
          prompt: g.prompt,
          options: g.options,
          correctAnswer: g.correctAnswer,
          explanation: g.explanation,
          distractorRationale: g.distractorRationale,
          sourceExcerpt: g.sourceExcerpt,
          sourcePage: g.sourcePage || 1,
        };

        if (targetMaterialId && targetTopicId && targetMaterialId !== "mat-general") {
          try {
            const persistedQ = await MedicalRepository.createQuestion({
              id: questionData.id,
              materialId: targetMaterialId,
              topicId: targetTopicId,
              type: questionData.type,
              difficulty: questionData.difficulty,
              prompt: questionData.prompt,
              options: questionData.options,
              correctAnswer: questionData.correctAnswer,
              explanation: questionData.explanation,
              distractorRationale: questionData.distractorRationale,
              sourceExcerpt: questionData.sourceExcerpt,
              sourcePage: questionData.sourcePage,
            });
            selected.push(persistedQ);
          } catch (dbErr) {
            console.warn("[Database Warning] Could not persist question, ephemeral:", dbErr);
            selected.push(questionData);
          }
        } else {
          selected.push(questionData);
        }
      }
    }

    const selectedQuestions = selected.slice(0, count);
    const clientQuestions = selectedQuestions.map((q) => {
      const shuffled = prepareQuestionOptions(
        q.options,
        q.correctAnswer || (typeof q.options[0] === "string" ? q.options[0] : (q.options[0] as any).text),
        q.id
      );

      q.options = shuffled.options as any;
      (q as any).correctOptionId = shuffled.correctOptionId;

      const verificationToken = createVerificationToken({
        questionId: q.id,
        correctOptionId: shuffled.correctOptionId,
        correctAnswer: shuffled.correctAnswerText,
        explanation: q.explanation || "",
        distractorRationale: q.distractorRationale,
        sourceExcerpt: q.sourceExcerpt,
        sourcePage: q.sourcePage,
      });

      return {
        id: q.id,
        materialId: q.materialId,
        materialTitle: q.materialTitle,
        topicId: q.topicId,
        topicName: q.topicName,
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: shuffled.options,
        sourcePage: q.sourcePage,
        verificationToken,
        targetMasteryLevel,
      };
    });

    const quizId = `quiz-${Date.now()}`;
    const titleMap: Record<string, string> = {
      PRACTICE: "Целевой медицинский тест",
      EXAM: "Экзаменационная симуляция на время",
      WEAK_TOPICS: "Адаптивный тест по слабым темам",
      REVIEW_WEAK: "Повторение слабых мест",
      DUE_TODAY: "Повторение тем на сегодня",
    };

    return NextResponse.json({
      success: true,
      meta: {
        totalExisting: existingQuestions.length,
        newlyGenerated: Math.max(0, selectedQuestions.length - Math.min(existingQuestions.length, selectedQuestions.length)),
        excludedCount: excludeUnion.length,
        focusTopicCount: finalFocusTopicIds.length,
      },
      quiz: {
        id: quizId,
        title: titleMap[mode] || "Целевой медицинский тест",
        mode,
        totalQuestions: clientQuestions.length,
        timeLimitMinutes: mode === "EXAM" ? Math.max(5, Math.round(clientQuestions.length * 1.5)) : null,
        questions: clientQuestions,
      },
    });
  } catch (error: any) {
    console.error("[API] /quizzes/generate error:", error?.code || "", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
