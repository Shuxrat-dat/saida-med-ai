import { openai, isLiveAIConfigured } from "./client";
import { SemanticChunk } from "../parsers/types";

export interface RetrievedChunk extends SemanticChunk {
  similarity: number;
}

export class RAGEngine {
  static async getEmbedding(text: string): Promise<number[]> {
    if (!isLiveAIConfigured()) {
      // Return 1536-dimensional mock vector
      return Array(1536).fill(0.01);
    }

    try {
      const res = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.replace(/\n/g, " "),
      });
      return res.data[0]?.embedding || Array(1536).fill(0.01);
    } catch (error) {
      console.error("Embedding generation error:", error);
      return Array(1536).fill(0.01);
    }
  }

  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static rankChunks(
    queryEmbedding: number[],
    chunksWithEmbeddings: { chunk: SemanticChunk; embedding: number[] }[],
    topK: number = 6
  ): RetrievedChunk[] {
    const scored = chunksWithEmbeddings.map((item) => {
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
      return {
        ...item.chunk,
        similarity,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }
}
