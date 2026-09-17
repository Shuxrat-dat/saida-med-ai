import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StorageProvider, StorageUploadResult } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  name = "SupabaseStorageProvider";
  private client: SupabaseClient | null = null;
  private bucket: string;

  constructor(bucketName?: string) {
    this.bucket = bucketName || process.env.SUPABASE_STORAGE_BUCKET || "medical-materials";
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && serviceRoleKey) {
      this.client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
    }
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl) {
        throw new Error(
          "Supabase Storage URL missing. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL."
        );
      }
      if (!serviceRoleKey) {
        throw new Error(
          "Supabase Storage key missing. Please set SUPABASE_SERVICE_ROLE_KEY (required for private bucket uploads)."
        );
      }

      this.client = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
    }
    return this.client;
  }

  private sanitizePath(rawPath: string): string {
    return rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  }

  async uploadFile(params: {
    path: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<StorageUploadResult> {
    const client = this.getClient();
    const cleanPath = this.sanitizePath(params.path);

    const { error } = await client.storage.from(this.bucket).upload(cleanPath, params.buffer, {
      contentType: params.contentType,
      upsert: true,
    });

    if (error) {
      console.error(`[Supabase Storage Error] Upload to '${this.bucket}/${cleanPath}' failed:`, error.message);
      throw new Error(`Supabase Storage upload error: ${error.message}`);
    }

    // For private buckets, generate a signed URL (valid for 2 years) so clients can view/download
    let fileUrl: string;
    try {
      const { data: signedData, error: signError } = await client.storage
        .from(this.bucket)
        .createSignedUrl(cleanPath, 60 * 60 * 24 * 365 * 2);

      if (!signError && signedData?.signedUrl) {
        fileUrl = signedData.signedUrl;
      } else {
        const { data: publicUrlData } = client.storage.from(this.bucket).getPublicUrl(cleanPath);
        fileUrl = publicUrlData.publicUrl;
      }
    } catch {
      const { data: publicUrlData } = client.storage.from(this.bucket).getPublicUrl(cleanPath);
      fileUrl = publicUrlData.publicUrl;
    }

    return {
      path: cleanPath,
      url: fileUrl,
      sizeBytes: params.buffer.length,
    };
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const cleanPath = this.sanitizePath(path);
      const { error } = await client.storage.from(this.bucket).remove([cleanPath]);
      if (error) {
        console.error(`[Supabase Storage Error] Delete from '${this.bucket}/${cleanPath}' failed:`, error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error("[Supabase Storage Error] Delete failed:", err?.message || err);
      return false;
    }
  }

  async getFileUrl(path: string): Promise<string> {
    const client = this.getClient();
    const cleanPath = this.sanitizePath(path);
    try {
      const { data: signedData, error: signError } = await client.storage
        .from(this.bucket)
        .createSignedUrl(cleanPath, 60 * 60 * 24 * 365 * 2);

      if (!signError && signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    } catch {}
    const { data } = client.storage.from(this.bucket).getPublicUrl(cleanPath);
    return data.publicUrl;
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const cleanPath = this.sanitizePath(path);
      const parts = cleanPath.split("/");
      const filename = parts.pop() || "";
      const folder = parts.join("/");

      const { data, error } = await client.storage.from(this.bucket).list(folder, {
        search: filename,
      });

      if (error || !data) return false;
      return data.some((item) => item.name === filename);
    } catch {
      return false;
    }
  }
}
