import { ExtractedPage, SemanticChunk } from "./types";

export class SemanticChunker {
  private static readonly TARGET_CHUNK_WORDS = 350;
  private static readonly MIN_CHUNK_WORDS = 80;
  private static readonly OVERLAP_SENTENCES = 2;

  static chunkPages(pages: ExtractedPage[]): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      // Extract paragraphs
      const rawParagraphs = pageText.split(/\n{2,}/);
      let currentChunkText = "";
      let currentSection = page.sectionTitle || this.detectHeading(rawParagraphs[0] || "");
      let lastSentences: string[] = [];

      for (const para of rawParagraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        // Check if paragraph itself looks like a heading
        const heading = this.detectHeading(cleanPara);
        if (heading && currentChunkText.length > 0) {
          // Finish previous chunk before starting new section
          chunks.push({
            chunkIndex: chunkIndex++,
            pageNumber: page.pageNumber,
            sectionTitle: currentSection,
            content: currentChunkText.trim(),
            tokenCount: this.estimateTokens(currentChunkText),
          });
          currentChunkText = "";
          currentSection = heading;
        }

        const words = cleanPara.split(/\s+/).length;
        const currentWords = currentChunkText.split(/\s+/).filter(Boolean).length;

        if (currentWords + words <= this.TARGET_CHUNK_WORDS) {
          currentChunkText += (currentChunkText ? "\n\n" : "") + cleanPara;
        } else {
          // Flush current chunk
          if (currentWords >= this.MIN_CHUNK_WORDS) {
            chunks.push({
              chunkIndex: chunkIndex++,
              pageNumber: page.pageNumber,
              sectionTitle: currentSection,
              content: currentChunkText.trim(),
              tokenCount: this.estimateTokens(currentChunkText),
            });

            // Extract trailing sentences for semantic overlap
            lastSentences = this.getTrailingSentences(currentChunkText, this.OVERLAP_SENTENCES);
            currentChunkText = lastSentences.join(" ") + "\n\n" + cleanPara;
          } else {
            currentChunkText += "\n\n" + cleanPara;
          }
        }
      }

      // Flush remainder of page
      if (currentChunkText.trim().length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
          sectionTitle: currentSection,
          content: currentChunkText.trim(),
          tokenCount: this.estimateTokens(currentChunkText),
        });
      }
    }

    return chunks;
  }

  private static detectHeading(text: string): string | undefined {
    const firstLine = text.split("\n")[0]?.trim() || "";
    // Check for Markdown headings
    if (/^#{1,4}\s+(.+)$/.test(firstLine)) {
      return firstLine.replace(/^#{1,4}\s+/, "");
    }
    // Check for "Section / Chapter / Part / Topic"
    if (/^(Section|Chapter|Part|Topic|Lecture)\s+[\w\d.-]+:?/i.test(firstLine)) {
      return firstLine;
    }
    // Check for all-caps short title (<= 60 chars)
    if (firstLine.length > 4 && firstLine.length <= 60 && firstLine === firstLine.toUpperCase() && /[A-Z]/.test(firstLine)) {
      return firstLine;
    }
    return undefined;
  }

  private static getTrailingSentences(text: string, count: number): string[] {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
    return sentences.slice(-count);
  }

  private static estimateTokens(text: string): number {
    // Standard rule of thumb: ~0.75 words per token (1 token ~ 4 chars)
    return Math.ceil(text.length / 4);
  }
}
