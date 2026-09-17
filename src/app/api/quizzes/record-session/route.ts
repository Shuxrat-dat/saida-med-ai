import { NextRequest, NextResponse } from "next/server";
import { MedicalRepository } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { materialId, durationSeconds, answers } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "Отсутствуют ответы для сохранения сессии" },
        { status: 400 }
      );
    }

    const result = await MedicalRepository.recordQuizSession({
      materialId,
      durationSeconds: durationSeconds || 60,
      answers,
    });

    const stats = await MedicalRepository.getStudyStats();

    return NextResponse.json({
      success: true,
      session: result.session,
      updatedTopics: result.updatedTopics,
      stats,
    });
  } catch (error: any) {
    console.error("Record session error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось сохранить учебную сессию" },
      { status: 500 }
    );
  }
}
