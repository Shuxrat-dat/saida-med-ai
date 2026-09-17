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
                {/* Суть простыми словами («на пальцах») */}
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100/80">
                  <div className="flex items-center space-x-1.5 text-teal-800 font-bold text-xs mb-1.5">
                    <Lightbulb className="w-4 h-4 text-teal-600" />
                    <span>Суть темы простыми словами</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {explanation.simpleOverview}
                  </p>
                </div>

                {/* Пошаговые механизмы */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Пошаговые механизмы</span>
                  </h4>
                  <div className="space-y-2">
                    {explanation.keyMechanisms.map((mech) => (
                      <div
                        key={mech.stepNumber}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60"
                      >
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 mb-1">
                          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px]">
                            {mech.stepNumber}
                          </span>
                          <span>{mech.title}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed pl-7">
                          {mech.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Клинические мнемоники и жемчужины */}
                {explanation.clinicalMnemonicsAndPearls?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
                    <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs mb-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Клинические мнемоники и правила памяти</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-amber-950">
                      {explanation.clinicalMnemonicsAndPearls.map((pearl, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span className="leading-snug">{pearl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ловушки на экзамене */}
                {explanation.examTraps?.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100">
                    <div className="flex items-center space-x-1.5 text-rose-900 font-bold text-xs mb-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Ловушки и дистракторы на экзамене</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {explanation.examTraps.map((trap, idx) => (
                        <div key={idx} className="bg-white/80 p-2.5 rounded-xl border border-rose-100/60">
                          <p className="text-rose-800 font-semibold mb-0.5">
                            Частая ошибка: {trap.pitfall}
                          </p>
                          <p className="text-slate-700 leading-relaxed">
                            <span className="font-bold text-emerald-700">Как на самом деле: </span>
                            {trap.clarification}
                          </p>
                        </div>
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
              <span>Готова! Начать тест</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
