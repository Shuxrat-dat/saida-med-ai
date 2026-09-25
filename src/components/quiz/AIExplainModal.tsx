"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Award, GraduationCap, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AIExplanationResult } from "@/lib/ai/explainer";

interface AIExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionPrompt: string;
  correctAnswer: string;
  sourceExcerpt?: string;
}

export function AIExplainModal({
  isOpen,
  onClose,
  questionPrompt,
  correctAnswer,
  sourceExcerpt,
}: AIExplainModalProps) {
  const [mode, setMode] = useState<"BEGINNER" | "MEDICAL_STUDENT" | "EXAM_LEVEL">("MEDICAL_STUDENT");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIExplanationResult | null>(null);

  // Trigger initial explanation when modal opens (moved out of render phase to avoid infinite loop)
  useEffect(() => {
    if (!isOpen) return;
    if (result || loading) return;
    fetchExplanation("MEDICAL_STUDENT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const fetchExplanation = async (selectedMode: "BEGINNER" | "MEDICAL_STUDENT" | "EXAM_LEVEL") => {
    setMode(selectedMode);
    setLoading(true);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPrompt,
          correctAnswer,
          sourceExcerpt,
          mode: selectedMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.explanation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-elevated max-h-[85dvh] overflow-y-auto"
        >
          {/* Шапка */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Медицинский разбор от AI</h3>
                <p className="text-[10px] text-slate-400">Контекстное педагогическое объяснение</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Переключатель уровней сложности объяснения */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => fetchExplanation("BEGINNER")}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                mode === "BEGINNER"
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Интуитивно</span>
            </button>

            <button
              onClick={() => fetchExplanation("MEDICAL_STUDENT")}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                mode === "MEDICAL_STUDENT"
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Студент</span>
            </button>

            <button
              onClick={() => fetchExplanation("EXAM_LEVEL")}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all ${
                mode === "EXAM_LEVEL"
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Award className="w-3 h-3" />
              <span>Экзамен</span>
            </button>
          </div>

          {/* Контент объяснения */}
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
                <p className="text-xs text-slate-500">Формируем клиническое объяснение...</p>
              </div>
            ) : result ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Суть</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.summary}</p>
                </div>

                {result.keyMechanisms.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Физиологические механизмы
                    </h4>
                    <ul className="space-y-1.5">
                      {result.keyMechanisms.map((m, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 flex items-start space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.clinicalPearl && (
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
                    <strong className="font-bold block mb-0.5">Экзаменационная подсказка:</strong>
                    <span>{result.clinicalPearl}</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
