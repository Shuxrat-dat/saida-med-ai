export interface ExtractedPage {
  pageNumber: number;
  text: string;
  sectionTitle?: string;
  imageUrl?: string;
}

export interface ExtractedDocument {
  title: string;
  fileType: string;
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
  metadata?: Record<string, any>;
}

export interface SemanticChunk {
  chunkIndex: number;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  tokenCount: number;
}
