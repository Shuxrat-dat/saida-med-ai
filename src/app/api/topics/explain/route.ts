import { NextRequest, NextResponse } from "next/server";
import { TopicExplainer } from "@/lib/ai/topic-explainer";
import { MedicalRepository } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicName, materialTitle, materialId } = body;

    if (!topicName) {
      return NextResponse.json({ error: "Не указано название темы" }, { status: 400 });
    }

    let concepts;
    if (materialId) {
      const topics = await MedicalRepository.getTopicsByMaterial(materialId);
      const matched = topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
      if (matched) {
        concepts = matched.concepts;
      }
    }

    const explanation = await TopicExplainer.explainTopic({
      topicName,
      materialTitle: materialTitle || "Медицинский конспект",
      concepts,
    });

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error: any) {
    console.error("Topic explanation error:", error);
    return NextResponse.json(
      { error: error?.message || "Не удалось получить объяснение темы" },
      { status: 500 }
    );
  }
}
