import { ExtractedDocument, ExtractedPage } from "./types";

export class TXTParser {
  static async parse(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
    const text = buffer.toString("utf-8");
    const pages: ExtractedPage[] = [];

    // Split by page markers if present (e.g. --- Page X --- or \f Form Feed)
    if (text.includes("\f")) {
      const parts = text.split("\f");
      parts.forEach((p, idx) => {
        pages.push({
          pageNumber: idx + 1,
          text: p.trim(),
        });
      });
    } else {
      // Split into ~400 word chunks as pages
      const paragraphs = text.split(/\n{2,}/);
      let currentPageText = "";
      let pageNum = 1;

      for (const p of paragraphs) {
        if ((currentPageText + p).length > 2500 && currentPageText.length > 0) {
          pages.push({
            pageNumber: pageNum++,
            text: currentPageText.trim(),
          });
          currentPageText = p;
        } else {
          currentPageText += (currentPageText ? "\n\n" : "") + p;
        }
      }

      if (currentPageText.trim()) {
        pages.push({
          pageNumber: pageNum,
          text: currentPageText.trim(),
        });
      }
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        text: text.trim() || "Empty text notes.",
      });
    }

    return {
      title: filename.replace(/\.(txt|md)$/i, ""),
      fileType: "txt",
      pageCount: pages.length,
      pages,
      fullText: text,
    };
  }
}
