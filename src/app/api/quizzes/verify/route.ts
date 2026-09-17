import { NextRequest, NextResponse } from "next/server";
import { verifyAnswerToken } from "@/lib/quiz/security";
import { MedicalRepository } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionId, selectedOptionId, verificationToken } = body;

    if (!questionId || !selectedOptionId) {
      return NextResponse.json(
        { error: "Не указан questionId или выбранный вариант ответа" },
        { status: 400 }
      );
    }

    // 1. Попытка валидации через криптографический токен (защита от утечки в state)
    if (verificationToken) {
      const payload = verifyAnswerToken(verificationToken);
      if (payload && payload.questionId === questionId) {
        const isCorrect =
          selectedOptionId === payload.correctOptionId ||
          selectedOptionId === payload.correctAnswer;

        return NextResponse.json({
          success: true,
          isCorrect,
          correctOptionId: payload.correctOptionId,
          correctAnswer: payload.correctAnswer,
          explanation: payload.explanation,
          distractorRationale: payload.distractorRationale,
          sourceExcerpt: payload.sourceExcerpt,
          sourcePage: payload.sourcePage,
        });
      }
    }

    // 2. Поиск в репозитории (база данных / in-memory store)
    const question = await MedicalRepository.getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: "Вопрос не найден" },
        { status: 404 }
      );
    }

    const isCorrect =
      selectedOptionId === question.correctOptionId ||
      selectedOptionId === question.correctAnswer;

    return NextResponse.json({
      success: true,
      isCorrect,
      correctOptionId: question.correctOptionId || question.correctAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      distractorRationale: question.distractorRationale,
      sourceExcerpt: question.sourceExcerpt,
      sourcePage: question.sourcePage,
    });
  } catch (error: any) {
    console.error("Ошибка верификации ответа:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось проверить ответ" },
      { status: 500 }
    );
  }
}
