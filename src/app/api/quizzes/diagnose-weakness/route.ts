import { NextRequest, NextResponse } from "next/server";
import { WeakSpotAnalyzer } from "@/lib/ai/weak-spot-analyzer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicName, totalQuestions, incorrectAnswers } = body;

    if (!topicName || typeof totalQuestions !== "number" || !Array.isArray(incorrectAnswers)) {
      return NextResponse.json(
        { error: "Некорректные параметры для аудита ошибок" },
        { status: 400 }
      );
    }

    const diagnosis = await WeakSpotAnalyzer.diagnoseWeakSpots({
      topicName,
      totalQuestions,
      incorrectAnswers,
    });

    return NextResponse.json({
      success: true,
      diagnosis,
    });
  } catch (error: any) {
    console.error("Diagnosis error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось провести аудит слабых мест" },
      { status: 500 }
    );
  }
}
