import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

function generatePageStoragePath(materialId, pageNumber, extension = "jpg") {
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const cleanExt = extension.replace(/^\./, "") || "jpg";
  return `materials/${materialId}/pages/${pageNumber}-${uniqueId}.${cleanExt}`;
}

function generateDocumentStoragePath(materialId, originalFilename) {
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const sanitized = originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
  return `materials/${materialId}/documents/${uniqueId}-${sanitized}`;
}

class LocalStorageProvider {
  name = "LocalStorageProvider";
}

class SupabaseStorageProvider {
  name = "SupabaseStorageProvider";
  constructor(bucketName) {
    this.bucket = bucketName || process.env.SUPABASE_STORAGE_BUCKET || "medical-materials";
    this.supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (this.supabaseUrl && this.serviceRoleKey) {
      this.client = createClient(this.supabaseUrl, this.serviceRoleKey, {
        auth: { persistSession: false },
      });
    }
  }

  getClient() {
    if (!this.client) {
      if (!this.supabaseUrl || !this.serviceRoleKey) {
        throw new Error("Supabase Storage credentials missing.");
      }
      this.client = createClient(this.supabaseUrl, this.serviceRoleKey, {
        auth: { persistSession: false },
      });
    }
    return this.client;
  }

  sanitizePath(rawPath) {
    return rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  }

  async uploadFile({ path, buffer, contentType }) {
    const client = this.getClient();
    const cleanPath = this.sanitizePath(path);
    const { error } = await client.storage.from(this.bucket).upload(cleanPath, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Supabase Storage upload error: ${error.message}`);

    const { data: signedData, error: signError } = await client.storage
      .from(this.bucket)
      .createSignedUrl(cleanPath, 60 * 60 * 24 * 365 * 2);

    let url;
    if (!signError && signedData?.signedUrl) {
      url = signedData.signedUrl;
    } else {
      const { data: publicUrlData } = client.storage.from(this.bucket).getPublicUrl(cleanPath);
      url = publicUrlData.publicUrl;
    }

    return { path: cleanPath, url, sizeBytes: buffer.length };
  }

  async fileExists(path) {
    const client = this.getClient();
    const cleanPath = this.sanitizePath(path);
    const parts = cleanPath.split("/");
    const filename = parts.pop() || "";
    const folder = parts.join("/");
    const { data, error } = await client.storage.from(this.bucket).list(folder, { search: filename });
    if (error || !data) return false;
    return data.some((item) => item.name === filename);
  }

  async deleteFile(path) {
    const client = this.getClient();
    const cleanPath = this.sanitizePath(path);
    const { error } = await client.storage.from(this.bucket).remove([cleanPath]);
    return !error;
  }
}

let storageInstance = null;
function getStorageService(forceNew = false) {
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

function resetStorageService() {
  storageInstance = null;
}

test("1. getStorageService returns LocalStorageProvider when STORAGE_TYPE=local", () => {
  const original = process.env.STORAGE_TYPE;
  process.env.STORAGE_TYPE = "local";
  resetStorageService();
  const service = getStorageService();
  assert.equal(service.name, "LocalStorageProvider");
  process.env.STORAGE_TYPE = original;
  resetStorageService();
});

test("2. getStorageService returns SupabaseStorageProvider when STORAGE_TYPE=supabase", () => {
  const original = process.env.STORAGE_TYPE;
  process.env.STORAGE_TYPE = "supabase";
  resetStorageService();
  const service = getStorageService();
  assert.equal(service.name, "SupabaseStorageProvider");
  process.env.STORAGE_TYPE = original;
  resetStorageService();
});

test("3. generatePageStoragePath formats correctly: materials/{id}/pages/{pageNumber}-{hex}.jpg", () => {
  const path = generatePageStoragePath("mat-123", 2, "jpg");
  assert.match(path, /^materials\/mat-123\/pages\/2-[a-f0-9]{8}\.jpg$/);
});

test("4. generateDocumentStoragePath sanitizes filename: materials/{id}/documents/{hex}-{filename}", () => {
  const path = generateDocumentStoragePath("mat-456", "Cardiology Lecture (Final!).pdf");
  assert.match(path, /^materials\/mat-456\/documents\/[a-f0-9]{8}-cardiology_lecture_final_\.pdf$/);
});

test("5. SupabaseStorageProvider detects NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", () => {
  const provider = new SupabaseStorageProvider("medical-materials");
  assert.equal(provider.name, "SupabaseStorageProvider");
  assert.equal(provider.bucket, "medical-materials");
  assert.ok(provider.supabaseUrl, "Should resolve Supabase URL");
  assert.ok(provider.serviceRoleKey, "Should resolve service role key");
});

test("6. Real Supabase Storage Upload and Signed URL verification against medical-materials bucket", async () => {
  const provider = new SupabaseStorageProvider("medical-materials");
  const testPath = "materials/test-suite/documents/test-" + Date.now() + ".txt";
  const testBuffer = Buffer.from("Saida Med AI Storage Verification: " + new Date().toISOString());

  const uploadResult = await provider.uploadFile({
    path: testPath,
    buffer: testBuffer,
    contentType: "text/plain",
  });

  assert.ok(uploadResult.url, "Upload should return an accessible URL");
  assert.equal(uploadResult.path, testPath);
  assert.equal(uploadResult.sizeBytes, testBuffer.length);

  const exists = await provider.fileExists(testPath);
  assert.equal(exists, true, "Uploaded file should exist in bucket");

  assert.ok(uploadResult.url.includes("token=") || uploadResult.url.includes("storage/v1/object/"), "URL should be a valid Supabase Storage URL");

  const deleted = await provider.deleteFile(testPath);
  assert.equal(deleted, true, "File should be deleted cleanly");

  const existsAfterDelete = await provider.fileExists(testPath);
  assert.equal(existsAfterDelete, false, "File should no longer exist after deletion");
});
