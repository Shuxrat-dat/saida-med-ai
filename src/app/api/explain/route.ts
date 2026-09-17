import { NextRequest, NextResponse } from "next/server";
import { AIExplainer } from "@/lib/ai/explainer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionPrompt, correctAnswer, sourceExcerpt, mode = "MEDICAL_STUDENT" } = body;

    if (!questionPrompt || !correctAnswer) {
      return NextResponse.json(
        { error: "Отсутствуют обязательные параметры вопроса" },
        { status: 400 }
      );
    }

    const explanation = await AIExplainer.explainConcept({
      questionPrompt,
      correctAnswer,
      sourceExcerpt,
      mode,
    });

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error: any) {
    console.error("Explanation error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось сформировать объяснение" },
      { status: 500 }
    );
  }
}
