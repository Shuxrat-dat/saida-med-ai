import crypto from "crypto";

export interface AnswerPayload {
  questionId: string;
  correctOptionId: string;
  correctAnswer: string;
  explanation: string;
  distractorRationale?: Record<string, string>;
  sourceExcerpt?: string;
  sourcePage?: number;
}

const SECRET = process.env.QUIZ_TOKEN_SECRET || "saida-med-ai-secure-quiz-key-2026-v1";
// Derive a 32-byte key using SHA-256
const ENCRYPTION_KEY = crypto.createHash("sha256").update(SECRET).digest();

/**
 * Creates an encrypted verification token so that correctAnswer is never
 * exposed in client state or network payloads before answer submission.
 */
export function createVerificationToken(payload: AnswerPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

  const jsonStr = JSON.stringify(payload);
  let encrypted = cipher.update(jsonStr, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts and verifies the answer token. Returns null if invalid or tampered.
 */
export function verifyAnswerToken(token: string): AnswerPayload | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted) as AnswerPayload;
  } catch {
    return null;
  }
}
