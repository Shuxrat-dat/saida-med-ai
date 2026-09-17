"use client";

import { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Key, ExternalLink, Loader2 } from "lucide-react";

export function GeminiKeyManager() {
  const [keyInput, setKeyInput] = useState("");
  const [providerInfo, setProviderInfo] = useState<{
    provider: string;
    model: string;
    isConfigured: boolean;
    maskedKey: string | null;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/ai-key")
      .then((res) => res.json())
      .then((data) => setProviderInfo(data))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings/ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setProviderInfo({
          provider: data.provider,
          model: data.model,
          isConfigured: true,
          maskedKey: data.maskedKey,
        });
        setKeyInput("");
      } else {
        setError(data.error || "Не удалось сохранить ключ");
      }
    } catch (err: any) {
      setError(err.message || "Ошибка подключения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-slate-900">
          <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold">Медицинский AI (Google Gemini)</h3>
            <p className="text-[10px] text-slate-400">Gemini 2.0 Flash • 100% Бесплатный тариф</p>
          </div>
        </div>

        {providerInfo?.isConfigured ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Подключен</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
            <span>Автономный режим</span>
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        Gemini 2.0 Flash обладает огромным контекстом (1M токенов), великолепно разбирает патофизиологию, генерирует клинические тесты и проводит диагностику слабых мест.
      </p>

      {providerInfo?.maskedKey && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px] text-slate-700">
              {providerInfo.maskedKey}
            </span>
          </div>
          <span className="text-[10px] font-bold text-teal-700">Активен</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-2">
        <div className="flex space-x-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Вставьте ключ AIzaSy..."
            className="flex-1 py-2 px-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={isSaving || !keyInput.trim()}
            className="py-2 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold transition-all ios-press shrink-0 flex items-center space-x-1.5"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Сохранить</span>
            )}
          </button>
        </div>

        {saveSuccess && (
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ключ успешно сохранён! AI готов к работе.</span>
          </p>
        )}

        {error && (
          <p className="text-[11px] text-rose-600 font-semibold">
            {error}
          </p>
        )}
      </form>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Нет ключа? Создаётся за 1 минуту:</span>
        <a
          href="https://aistudio.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-700 hover:text-teal-800 font-bold inline-flex items-center space-x-1"
        >
          <span>Google AI Studio</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
