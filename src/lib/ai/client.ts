import OpenAI from "openai";

const globalForAI = globalThis as unknown as {
  runtimeGeminiKey?: string;
};

export function setRuntimeGeminiKey(key: string) {
  globalForAI.runtimeGeminiKey = key.trim();
}

export function getRuntimeGeminiKey(): string | null {
  return (
    globalForAI.runtimeGeminiKey ||
    process.env.GEMINI_API_KEY ||
    null
  );
}

export interface ActiveAIConfig {
  provider: "GEMINI" | "OPENAI" | "MOCK";
  model: string;
  client: OpenAI;
}

export function getActiveAIConfig(): ActiveAIConfig {
  const geminiKey = getRuntimeGeminiKey();
  if (geminiKey && geminiKey.length > 15 && !geminiKey.startsWith("mock")) {
    return {
      provider: "GEMINI",
      model: "gemini-2.0-flash",
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey && openAiKey.length > 20 && !openAiKey.startsWith("sk-mock")) {
    return {
      provider: "OPENAI",
      model: "gpt-4o-mini",
      client: new OpenAI({
        apiKey: openAiKey,
      }),
    };
  }

  return {
    provider: "MOCK",
    model: "mock",
    client: new OpenAI({
      apiKey: "sk-mock-key",
    }),
  };
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-mock-key",
});

export const isLiveAIConfigured = () => {
  const config = getActiveAIConfig();
  return config.provider !== "MOCK";
};
