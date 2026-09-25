"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Zap,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { TopicDeepExplanation } from "@/lib/ai/topic-explainer";

interface TopicPreStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
  materialTitle: string;
  materialId?: string;
  onStartQuiz: () => void;
}

export function TopicPreStudyModal({
  isOpen,
  onClose,
  topicId,
  topicName,
  materialTitle,
  materialId,
  onStartQuiz,
}: TopicPreStudyModalProps) {
  const [activeTab, setActiveTab] = useState<"EXPLAIN" | "QUICK_START">("EXPLAIN");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<TopicDeepExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch("/api/topics/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicName,
        materialTitle,
        materialId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.explanation) {
          setExplanation(data.explanation);
        } else {
          setError(data.error || "Не удалось загрузить объяснение");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Ошибка подключения");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, topicName, materialTitle, materialId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-xs p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* iOS Handle & Шапка */}
          <div className="pt-2.5 pb-2 px-5 border-b border-slate-100 relative shrink-0">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2 sm:hidden" />
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-6">
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block truncate">
                  {materialTitle}
                </span>
                <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                  {topicName}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 flex items-center justify-center shrink-0 ios-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Переключатель: Разжевать тему vs Пропустить */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mt-3 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("EXPLAIN")}
                className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ios-press ${
                  activeTab === "EXPLAIN"
                    ? "bg-white text-teal-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Разжевать тему</span>
              </button>

              <button
                onClick={() => {
                  onStartQuiz();
                  onClose();
                }}
                className="py-2 px-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 text-indigo-700 hover:bg-white/60 ios-press"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Сразу к тестам</span>
              </button>
            </div>
          </div>

          {/* Тело объяснения с прокруткой */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  Медицинский AI анализирует тему и конспект...
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Формируем разбор «на пальцах», пошаговые механизмы и частые экзаменационные ловушки.
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs">
                <p className="font-semibold mb-1">Не удалось сформировать разбор</p>
                <p>{error}</p>
                <button
                  onClick={onStartQuiz}
                  className="mt-3 py-2 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs inline-flex items-center space-x-1"
                >
                  <span>Перейти сразу к тесту</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : explanation ? (
              <div className="space-y-4">
                {(() => {
                  const missingSet = new Set(
                    (explanation.missingFromSource || []).map((m) => m.sectionKey)
                  );
                  const sections: Array<{
                    key: string;
                    icon: React.ReactNode;
                    title: string;
                    bg: string;
                    border: string;
                    textColor: string;
                    content: string;
                  }> = [
                    {
                      key: "whatIsIt",
                      icon: <Lightbulb className="w-4 h-4 text-teal-600" />,
                      title: "Что это?",
                      bg: "bg-teal-50/70",
                      border: "border-teal-100/80",
                      textColor: "text-teal-800",
                      content: explanation.whatIsIt,
                    },
                    {
                      key: "whyItOccurs",
                      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
                      title: "Почему возникает?",
                      bg: "bg-amber-50/60",
                      border: "border-amber-100/80",
                      textColor: "text-amber-800",
                      content: explanation.whyItOccurs,
                    },
                    {
                      key: "pathogenesis",
                      icon: <BookOpen className="w-4 h-4 text-indigo-600" />,
                      title: "Патогенез / механизм",
                      bg: "bg-indigo-50/60",
                      border: "border-indigo-100/80",
                      textColor: "text-indigo-800",
                      content: explanation.pathogenesis,
                    },
                    {
                      key: "mainSigns",
                      icon: <CheckCircle2 className="w-4 h-4 text-rose-500" />,
                      title: "Основные признаки",
                      bg: "bg-rose-50/60",
                      border: "border-rose-100",
                      textColor: "text-rose-800",
                      content: explanation.mainSigns,
                    },
                    {
                      key: "classification",
                      icon: <BookOpen className="w-4 h-4 text-sky-600" />,
                      title: "Классификация",
                      bg: "bg-sky-50/60",
                      border: "border-sky-100/80",
                      textColor: "text-sky-800",
                      content: explanation.classification,
                    },
                    {
                      key: "diagnostics",
                      icon: <AlertTriangle className="w-4 h-4 text-violet-600" />,
                      title: "Диагностика",
                      bg: "bg-violet-50/60",
                      border: "border-violet-100/80",
                      textColor: "text-violet-800",
                      content: explanation.diagnostics,
                    },
                    {
                      key: "treatmentApproaches",
                      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
                      title: "Подходы к лечению",
                      bg: "bg-emerald-50/60",
                      border: "border-emerald-100/80",
                      textColor: "text-emerald-800",
                      content: explanation.treatmentApproaches,
                    },
                  ];

                  return (
                    <>
                      {sections.map((s) => (
                        <div
                          key={s.key}
                          className={`p-4 rounded-2xl ${s.bg} border ${s.border}`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <div className={`flex items-center space-x-1.5 ${s.textColor}`}>
                              {s.icon}
                              <span>{s.title}</span>
                            </div>
                            {missingSet.has(s.key) && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 text-[10px] font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Нет в конспекте</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {s.content}
                          </p>
                        </div>
                      ))}

                      {/* Ключевые моменты на запоминание */}
                      {explanation.keyPointsToRemember?.length > 0 && (
                        <div className="p-4 rounded-2xl bg-yellow-50/70 border border-yellow-200/70">
                          <div className="flex items-center space-x-1.5 text-yellow-800 font-bold text-xs mb-2">
                            <Sparkles className="w-4 h-4 text-yellow-600" />
                            <span>Что запомнить ⭐</span>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-700">
                            {explanation.keyPointsToRemember.map((point, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-yellow-600 font-bold mt-0.5">{idx + 1}.</span>
                                <span className="leading-snug">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* missingFromSource summary */}
                      {(explanation.missingFromSource?.length ?? 0) > 0 && (
                        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200/60">
                          <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px] mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Разделы, не найденные в твоём материале:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {explanation.missingFromSource!.map((m) => (
                              <span
                                key={m.sectionKey}
                                title={m.reason}
                                className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600"
                              >
                                ⚠️ {m.sectionKey}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ссылки на страницы конспекта */}
                      {explanation.sourcePageReferences?.length > 0 && (
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
                          <span className="font-medium">Страницы в источнике:</span>
                          {explanation.sourcePageReferences.map((pg) => (
                            <span
                              key={pg}
                              className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700"
                            >
                              стр. {pg}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>

          {/* Нижняя кнопка перехода к тесту */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 text-xs font-bold ios-press"
            >
              Закрыть
            </button>
            <button
              onClick={() => {
                onStartQuiz();
                onClose();
              }}
              className="py-2.5 px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm ios-press"
            >
              <span>Я ознакомилась — начать тест</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
