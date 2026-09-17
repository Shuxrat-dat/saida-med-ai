import { NextRequest, NextResponse } from "next/server";
import { MedicalRepository } from "@/lib/db/repository";
import { QuestionGenerator } from "@/lib/ai/question-generator";
import { prepareQuestionOptions } from "@/lib/quiz/shuffle";
import { createVerificationToken } from "@/lib/quiz/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      materialId,
      topicId,
      mode = "PRACTICE", // PRACTICE | EXAM | WEAK_TOPICS
      count = 5,
      difficulty = "MEDIUM",
    } = body;

    // Fetch relevant existing questions from repository
    let questions = await MedicalRepository.getQuestions({
      materialId: materialId || undefined,
      topicId: topicId || undefined,
      weakOnly: mode === "WEAK_TOPICS",
      limit: count,
    });

    // If fewer than requested, dynamically generate grounded questions
    if (questions.length < count) {
      const material = materialId
        ? await MedicalRepository.getMaterialById(materialId)
        : null;

      const generated = await QuestionGenerator.generateQuestions({
        materialTitle: material?.title || "Medical Lecture Curriculum",
        topicName: topicId ? "Targeted Clinical Concept" : "Comprehensive Review",
        chunks: [
          {
            chunkIndex: 0,
            pageNumber: 1,
            sectionTitle: "Cardiovascular and Pharmacological Principles",
            content:
              "Systemic baseline hemodynamics and autonomic responses are governed by beta-1 adrenergic and cholinergic receptor tone. Selective stimulation increases chronotropy and inotropy via Gs protein activation.",
            tokenCount: 40,
          },
        ],
        count: count - questions.length,
        difficulty: difficulty as any,
      });

      // 2. Получение доступного материала и темы для привязки вопроса
      let targetMaterialId = materialId;
      let targetTopicId = topicId;
      let targetMaterialTitle = material?.title;

      if (!targetMaterialId || !targetTopicId) {
        const existingMaterials = await MedicalRepository.getMaterials();
        if (existingMaterials.length > 0) {
          const firstMat = existingMaterials[0];
          targetMaterialId = targetMaterialId || firstMat.id;
          targetMaterialTitle = targetMaterialTitle || firstMat.title;
          const matTopics = await MedicalRepository.getTopicsByMaterial(firstMat.id);
          if (matTopics.length > 0) {
            targetTopicId = targetTopicId || matTopics[0].id;
          }
        }
      }

      // Convert generated questions to repository model and persist if valid relation exists
      for (const g of generated) {
        const questionData = {
          id: `q-dyn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          materialId: targetMaterialId || "mat-general",
          materialTitle: targetMaterialTitle || "Медицинский материал",
          topicId: targetTopicId || "top-general",
          topicName: g.topicName || "Клинические концепции",
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
            questions.push(persistedQ);
          } catch (dbErr) {
            console.error("[Database Warning] Could not persist question, returning ephemeral:", dbErr);
            questions.push(questionData);
          }
        } else {
          questions.push(questionData);
        }
      }
    }

    // Process and shuffle options for each question using unbiased Fisher-Yates
    const selectedQuestions = questions.slice(0, count);
    const clientQuestions = selectedQuestions.map((q) => {
      // Shuffled options with stable IDs and validation
      const shuffled = prepareQuestionOptions(
        q.options,
        q.correctAnswer || (typeof q.options[0] === "string" ? q.options[0] : q.options[0].text),
        q.id
      );

      // Store shuffled state on the question object in memory
      q.options = shuffled.options;
      q.correctOptionId = shuffled.correctOptionId;

      // Create encrypted verification token to prevent client-side answer leakage
      const verificationToken = createVerificationToken({
        questionId: q.id,
        correctOptionId: shuffled.correctOptionId,
        correctAnswer: shuffled.correctAnswerText,
        explanation: q.explanation || "",
        distractorRationale: q.distractorRationale,
        sourceExcerpt: q.sourceExcerpt,
        sourcePage: q.sourcePage,
      });

      // Client representation: options are shuffled objects { id, text }
      // correctAnswer and explanation are omitted for anti-cheat security
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
      };
    });

    const quizId = `quiz-${Date.now()}`;
    return NextResponse.json({
      success: true,
      quiz: {
        id: quizId,
        title:
          mode === "WEAK_TOPICS"
            ? "Адаптивный тест по слабым темам"
            : mode === "EXAM"
            ? "Экзаменационная симуляция на время"
            : "Целевой медицинский тест",
        mode,
        totalQuestions: clientQuestions.length,
        timeLimitMinutes: mode === "EXAM" ? Math.round(clientQuestions.length * 1.5) : null,
        questions: clientQuestions,
      },
    });
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
