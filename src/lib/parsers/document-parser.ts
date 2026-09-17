import { ExtractedDocument, ExtractedPage } from "./types";
import { PDFParser } from "./pdf";
import { DOCXParser } from "./docx";
import { PPTXParser } from "./pptx";
import { TXTParser } from "./txt";
import { OCRService, OCRQualityAssessment } from "./ocr/ocr-service";

export interface BatchImageItem {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  pageNumber: number;
}

export interface BatchExtractionResult extends ExtractedDocument {
  pageAssessments: { pageNumber: number; assessment: OCRQualityAssessment }[];
}

export class DocumentParser {
  static async parseFile(
    buffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<ExtractedDocument> {
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    if (ext === "pdf" || mimeType === "application/pdf") {
      return PDFParser.parse(buffer, filename);
    }

    if (
      ext === "docx" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return DOCXParser.parse(buffer, filename);
    }

    if (
      ext === "pptx" ||
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return PPTXParser.parse(buffer, filename);
    }

    if (["jpg", "jpeg", "png", "webp"].includes(ext) || mimeType?.startsWith("image/")) {
      const ocrText = await OCRService.extract(buffer, mimeType || "image/jpeg", 1);
      return {
        title: filename.replace(/\.[^.]+$/, ""),
        fileType: ext,
        pageCount: 1,
        pages: [{ pageNumber: 1, text: ocrText, sectionTitle: "Рукописные / печатные материалы" }],
        fullText: ocrText,
      };
    }

    // Default to plain text
    return TXTParser.parse(buffer, filename);
  }

  /**
   * Processes a multi-page camera scan batch of medical lecture/textbook pages.
   * Runs OCR for each page and preserves exact pageNumber references.
   */
  static async parseImagesBatch(
    items: BatchImageItem[],
    preferredTitle?: string
  ): Promise<BatchExtractionResult> {
    const pages: ExtractedPage[] = [];
    const assessments: { pageNumber: number; assessment: OCRQualityAssessment }[] = [];

    // Sort items by pageNumber
    const sorted = [...items].sort((a, b) => a.pageNumber - b.pageNumber);

    for (const item of sorted) {
      const pageText = await OCRService.extract(item.buffer, item.mimeType, item.pageNumber);
      const quality = OCRService.assessQuality(pageText);

      pages.push({
        pageNumber: item.pageNumber,
        text: pageText,
        sectionTitle: `Страница ${item.pageNumber}`,
      });

      assessments.push({
        pageNumber: item.pageNumber,
        assessment: quality,
      });
    }

    const fullText = pages.map((p) => p.text).join("\n\n---\n\n");

    // Infer title if not explicitly provided
    let title = preferredTitle;
    if (!title) {
      const firstLine = pages[0]?.text.split("\n")[0]?.trim() || "";
      if (firstLine.length > 5 && firstLine.length < 80) {
        title = firstLine.replace(/^[#0-9.\s]+/, "");
      } else {
        title = `Скан конспекта от ${new Date().toLocaleDateString("ru-RU")}`;
      }
    }

    return {
      title,
      fileType: "camera_scan",
      pageCount: pages.length,
      pages,
      fullText,
      pageAssessments: assessments,
    };
  }
}
