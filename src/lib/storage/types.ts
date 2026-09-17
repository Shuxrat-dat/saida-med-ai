export interface StorageUploadResult {
  path: string;
  url: string;
  sizeBytes: number;
}

export interface StorageProvider {
  name: string;
  uploadFile(params: {
    path: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<StorageUploadResult>;
  deleteFile(path: string): Promise<boolean>;
  getFileUrl(path: string): Promise<string>;
  fileExists(path: string): Promise<boolean>;
}
