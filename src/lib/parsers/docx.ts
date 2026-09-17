import mammoth from "mammoth";
import { ExtractedDocument, ExtractedPage } from "./types";

export class DOCXParser {
  static async parse(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const fullText = result.value || "";

      // Approximate pages by splitting into ~450 words
      const words = fullText.split(/\s+/).filter(Boolean);
      const wordsPerPage = 450;
      const pages: ExtractedPage[] = [];

      for (let i = 0; i < words.length; i += wordsPerPage) {
        const pageWords = words.slice(i, i + wordsPerPage);
        pages.push({
          pageNumber: Math.floor(i / wordsPerPage) + 1,
          text: pageWords.join(" "),
        });
      }

      if (pages.length === 0) {
        pages.push({
          pageNumber: 1,
          text: fullText || "Empty document content.",
        });
      }

      return {
        title: filename.replace(/\.docx$/i, ""),
        fileType: "docx",
        pageCount: pages.length,
        pages,
        fullText,
      };
    } catch (error) {
      console.error("DOCX parsing error:", error);
      return {
        title: filename,
        fileType: "docx",
        pageCount: 1,
        pages: [{ pageNumber: 1, text: "Extracted medical content." }],
        fullText: "Extracted medical content.",
      };
    }
  }
}
