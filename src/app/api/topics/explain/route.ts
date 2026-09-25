import { NextRequest, NextResponse } from "next/server";
import { TopicExplainer } from "@/lib/ai/topic-explainer";
import { MedicalRepository } from "@/lib/db/repository";
import { prisma } from "@/lib/db/prisma";
import { SemanticChunk } from "@/lib/parsers/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicName, materialTitle, materialId } = body;

    if (!topicName) {
      return NextResponse.json({ error: "Не указано название темы" }, { status: 400 });
    }

    let concepts;
    let chunks: SemanticChunk[] = [];

    if (materialId) {
      const topics = await MedicalRepository.getTopicsByMaterial(materialId);
      const matched = topics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
      if (matched) {
        concepts = matched.concepts;
      }

      // Fetch document chunks for source-grounded explanation
      const dbChunks = await prisma.documentChunk.findMany({
        where: { materialId },
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

    const explanation = await TopicExplainer.explainTopic({
      topicName,
      materialTitle: materialTitle || "Медицинский конспект",
      chunks,
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
