"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SafeContainer } from "@/components/layout/SafeContainer";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { MockQuestion, MockMaterial, MockTopic } from "@/lib/db/mock-data";
import {
  HelpCircle,
  Sparkles,
  Target,
  ArrowRight,
  Loader2,
} from "lucide-react";

function QuizHubContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") || "PRACTICE";
  const initialTopicId = searchParams.get("topicId") || "";
  const initialMaterialId = searchParams.get("materialId") || "";

  const [mode, setMode] = useState<string>(initialMode);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("MEDIUM");

  const [activeQuizQuestions, setActiveQuizQuestions] = useState<MockQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Если передан параметр, сразу запускаем сессию
    if (initialMode === "WEAK_TOPICS" || initialTopicId) {
      startQuizSession(initialMode, initialMaterialId, initialTopicId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startQuizSession = async (
    targetMode = mode,
    matId = selectedMaterialId,
    topId = selectedTopicId
  ) => {
    setLoading(true);
    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: targetMode,
          materialId: matId || undefined,
          topicId: topId || undefined,
          count: questionCount,
          difficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveQuizQuestions(data.quiz.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Если сессия активна, рендерим плеер теста
  if (activeQuizQuestions && activeQuizQuestions.length > 0) {
    return (
      <SafeContainer>
        <div className="pt-2 pb-3">
          <QuizPlayer
            questions={activeQuizQuestions}
            quizTitle={
              mode === "WEAK_TOPICS"
                ? "Тест по слабым темам"
                : mode === "EXAM"
                ? "Экзаменационная симуляция на время"
                : "Медицинский тест по источникам"
            }
            onExit={() => setActiveQuizQuestions(null)}
          />
        </div>
      </SafeContainer>
    );
  }

  return (
    <SafeContainer>
      <div className="pt-2 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Тестирование и самопроверка
        </h2>
        <p className="text-xs text-slate-500">
          Вопросы строго по вашим учебным материалам
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Генерируем вопросы по источнику...
          </p>
          <p className="text-[11px] text-slate-400">
            Проверяем цитаты и варианты ответов для исключения неточностей
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Быстрый запуск: "Протестируй меня по слабым темам" */}
          <div
            onClick={() => startQuizSession("WEAK_TOPICS")}
            className="p-5 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-ios-card cursor-pointer transition-all ios-press relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                <Target className="w-3 h-3 text-rose-200" />
                <span>Рекомендовано для Саиды</span>
              </span>
              <span className="text-[10px] text-rose-100 font-medium">70% слабые темы / 30% повторение</span>
            </div>

            <h3 className="text-base font-bold">Протестируй меня по слабым темам</h3>
            <p className="text-xs text-rose-100 mt-1 max-w-[280px]">
              Автоматически подбирает вопросы по рецепторам и механизмам дыхания, где ранее были ошибки.
            </p>

            <div className="mt-4 pt-3 border-t border-rose-400/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-100">10 важных вопросов</span>
              <div className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white text-rose-700 text-xs font-bold shadow-xs">
                <span>Начать</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Карточка индивидуальной настройки теста */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Настроить тест</h3>
            </div>

            {/* Выбор режима */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Режим занятия
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("PRACTICE")}
                  className={`p-3 rounded-2xl border text-left transition-all ios-press ${
                    mode === "PRACTICE"
                      ? "border-teal-600 bg-teal-50/60 text-teal-950 font-bold shadow-2xs"
                      : "border-slate-200 bg-slate-50/50 text-slate-600"
                  }`}
                >
                  <span className="text-xs block">Режим практики</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Мгновенные объяснения и цитаты
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("EXAM")}
                  className={`p-3 rounded-2xl border text-left transition-all ios-press ${
                    mode === "EXAM"
                      ? "border-teal-600 bg-teal-50/60 text-teal-950 font-bold shadow-2xs"
                      : "border-slate-200 bg-slate-50/50 text-slate-600"
                  }`}
                >
                  <span className="text-xs block">Режим экзамена</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    На время, разбор в конце
                  </span>
                </button>
              </div>
            </div>

            {/* Количество вопросов */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Количество вопросов
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ios-press ${
                      questionCount === num
                        ? "bg-teal-700 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {num} вопросов
                  </button>
                ))}
              </div>
            </div>

            {/* Выбор сложности */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Сложность вопросов
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "EASY", label: "Легко" },
                  { id: "MEDIUM", label: "Средне" },
                  { id: "HARD", label: "Сложно" },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setDifficulty(diff.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ios-press ${
                      difficulty === diff.id
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Кнопка запуска */}
            <button
              onClick={() => startQuizSession(mode)}
              className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 ios-press"
            >
              <Sparkles className="w-4 h-4" />
              <span>Запустить тест</span>
            </button>
          </div>
        </div>
      )}
    </SafeContainer>
  );
}

export default function QuizHubPage() {
  return (
    <Suspense
      fallback={
        <SafeContainer>
          <div className="py-20 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
            <span>Загрузка раздела тестов...</span>
          </div>
        </SafeContainer>
      }
    >
      <QuizHubContent />
    </Suspense>
  );
}
