import fs from "node:fs/promises";
import path from "node:path";
import { StorageProvider, StorageUploadResult } from "./types";

export class LocalStorageProvider implements StorageProvider {
  name = "LocalStorageProvider";
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.join(process.cwd(), "public", "uploads");
  }

  private resolveSafePath(relativePath: string): string {
    // Sanitize and prevent directory traversal
    const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    return path.join(this.baseDir, normalized);
  }

  async uploadFile(params: {
    path: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<StorageUploadResult> {
    const fullPath = this.resolveSafePath(params.path);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, params.buffer);

    // Local public URL (served via Next.js static /uploads/...)
    const normalizedRelative = params.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const url = `/uploads/${normalizedRelative}`;

    return {
      path: params.path,
      url,
      sizeBytes: params.buffer.length,
    };
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(relativePath);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(relativePath: string): Promise<string> {
    const normalizedRelative = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `/uploads/${normalizedRelative}`;
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
