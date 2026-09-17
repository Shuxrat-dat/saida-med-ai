import crypto from "node:crypto";
import { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local-storage";
import { SupabaseStorageProvider } from "./supabase-storage";

export * from "./types";
export * from "./local-storage";
export * from "./supabase-storage";

let storageInstance: StorageProvider | null = null;

export function getStorageService(forceNew: boolean = false): StorageProvider {
  if (!storageInstance || forceNew) {
    const storageType = (process.env.STORAGE_TYPE || "local").toLowerCase().trim();

    if (storageType === "supabase") {
      storageInstance = new SupabaseStorageProvider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance;
}

export function resetStorageService(): void {
  storageInstance = null;
}

/**
 * Generates structured, collision-resistant path for scanned camera pages:
 * materials/{materialId}/pages/{pageNumber}-{uniqueId}.jpg
 */
export function generatePageStoragePath(
  materialId: string,
  pageNumber: number,
  extension: string = "jpg"
): string {
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const cleanExt = extension.replace(/^\./, "") || "jpg";
  return `materials/${materialId}/pages/${pageNumber}-${uniqueId}.${cleanExt}`;
}

/**
 * Generates structured, collision-resistant path for uploaded documents:
 * materials/{materialId}/documents/{uniqueId}-{filename}
 */
export function generateDocumentStoragePath(
  materialId: string,
  originalFilename: string
): string {
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const sanitized = originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
  return `materials/${materialId}/documents/${uniqueId}-${sanitized}`;
}
