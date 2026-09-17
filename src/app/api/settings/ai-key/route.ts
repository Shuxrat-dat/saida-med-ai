import { NextRequest, NextResponse } from "next/server";
import { getActiveAIConfig, getRuntimeGeminiKey, setRuntimeGeminiKey } from "@/lib/ai/client";

export async function GET() {
  const config = getActiveAIConfig();
  const currentKey = getRuntimeGeminiKey() || process.env.OPENAI_API_KEY || null;

  let maskedKey = null;
  if (currentKey && currentKey.length > 8) {
    maskedKey = `${currentKey.slice(0, 6)}...${currentKey.slice(-4)}`;
  }

  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    isConfigured: config.provider !== "MOCK",
    maskedKey,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return NextResponse.json(
        { error: "Некорректный формат API-ключа Google Gemini" },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();
    setRuntimeGeminiKey(cleanKey);

    const config = getActiveAIConfig();

    return NextResponse.json({
      success: true,
      message: "API-ключ Google Gemini успешно сохранён",
      provider: config.provider,
      model: config.model,
      maskedKey: `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ошибка при сохранении ключа" },
      { status: 500 }
    );
  }
}
