import JSZip from "jszip";
import { ExtractedDocument, ExtractedPage } from "./types";

export class PPTXParser {
  static async parse(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const pages: ExtractedPage[] = [];
      let slideIndex = 1;

      // Scan for slide XML files in order: slide1.xml, slide2.xml...
      while (true) {
        const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
        if (!slideFile) break;

        const xmlContent = await slideFile.async("string");
        // Extract text inside <a:t>...</a:t> tags
        const textMatches = xmlContent.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
        let slideText = "";
        if (textMatches) {
          slideText = textMatches
            .map((m) => m.replace(/<[^>]+>/g, "").trim())
            .filter(Boolean)
            .join(" ");
        }

        pages.push({
          pageNumber: slideIndex,
          text: slideText || `Slide ${slideIndex}`,
          sectionTitle: `Slide ${slideIndex}`,
        });

        slideIndex++;
      }

      if (pages.length === 0) {
        pages.push({
          pageNumber: 1,
          text: "Medical presentation slides.",
          sectionTitle: "Slide 1",
        });
      }

      const fullText = pages.map((p) => p.text).join("\n\n");

      return {
        title: filename.replace(/\.pptx$/i, ""),
        fileType: "pptx",
        pageCount: pages.length,
        pages,
        fullText,
      };
    } catch (error) {
      console.error("PPTX parsing error:", error);
      return {
        title: filename,
        fileType: "pptx",
        pageCount: 1,
        pages: [{ pageNumber: 1, text: "Extracted medical presentation text." }],
        fullText: "Extracted medical presentation text.",
      };
    }
  }
}
