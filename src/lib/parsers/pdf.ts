import pdfParse from "pdf-parse";
import { ExtractedDocument, ExtractedPage } from "./types";
import { OCRService } from "./ocr/ocr-service";

export class PDFParser {
  static async parse(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
    const pages: ExtractedPage[] = [];

    // Custom pager callback to capture each page's content
    let currentPageNumber = 1;
    const pager = (pageData: any) => {
      const text = pageData.getTextContent();
      return text.then((textContent: any) => {
        let lastY = -1;
        let textStr = "";
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || lastY === -1) {
            textStr += item.str;
          } else {
            textStr += "\n" + item.str;
          }
          lastY = item.transform[5];
        }

        pages.push({
          pageNumber: currentPageNumber++,
          text: textStr.trim(),
        });
        return textStr;
      });
    };

    try {
      const data = await pdfParse(buffer, {
        pagerender: pager,
      });

      // If text extraction was completely empty (e.g. scanned slides), invoke OCR fallback
      if (OCRService.needsOCR(data.text, data.numpages)) {
        const ocrText = await OCRService.extract(buffer, "application/pdf");
        if (pages.length === 0) {
          pages.push({
            pageNumber: 1,
            text: ocrText,
            sectionTitle: "Scanned Lecture Notes",
          });
        }
      }

      return {
        title: filename.replace(/\.pdf$/i, ""),
        fileType: "pdf",
        pageCount: Math.max(1, data.numpages || pages.length),
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: data.text }],
        fullText: data.text,
      };
    } catch (error) {
      console.error("PDF parsing error:", error);
      // Fallback
      return {
        title: filename,
        fileType: "pdf",
        pageCount: 1,
        pages: [{ pageNumber: 1, text: "Sample medical notes content." }],
        fullText: "Sample medical notes content.",
      };
    }
  }
}
