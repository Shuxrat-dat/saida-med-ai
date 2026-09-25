"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  Loader2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { MockQuestion, QuizOption } from "@/lib/db/mock-data";
import { WeakSpotDiagnosis } from "@/lib/ai/weak-spot-analyzer";
import { SourceCitationModal } from "./SourceCitationModal";
import { AIExplainModal } from "./AIExplainModal";

interface QuizPlayerProps {
  questions: MockQuestion[];
  quizTitle: string;
  onExit?: () => void;
}

interface AnswerVerificationData {
  isCorrect: boolean;
  correctOptionId: string;
  correctAnswer: string;
  explanation: string;
  distractorRationale?: Record<string, string>;
  sourceExcerpt?: string;
  sourcePage?: number;
}

export function QuizPlayer({ questions, quizTitle, onExit }: QuizPlayerProps) {
  const SESSION_KEY = 'quiz_session_backup_v1';

  const readSessionBackup = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const backup = readSessionBackup();

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const v = backup?.currentIndex;
    return typeof v === 'number' && v >= 0 && v < (questions?.length ?? 1) ? v : 0;
  });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(() => {
    const v = backup?.selectedOptionId;
    return typeof v === 'string' ? v : null;
  });
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [answerData, setAnswerData] = useState<AnswerVerificationData | null>(null);

  const [results, setResults] = useState<{
    correctCount: number;
    incorrectCount: number;
    answers: {
      question: MockQuestion;
      selected: string;
      isCorrect: boolean;
      responseTimeMs: number;
      userAnswerText: string;
    }[];
  }>(() => {
    const v = backup?.results;
    if (v && typeof v.correctCount === 'number' && typeof v.incorrectCount === 'number' && Array.isArray(v.answers)) {
      return v;
    }
    return {
      correctCount: 0,
      incorrectCount: 0,
      answers: [],
    };
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [questionStartAt, setQuestionStartAt] = useState<number>(() => Date.now());

  useEffect(() => {
    setQuestionStartAt(Date.now());
  }, [currentIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ currentIndex, selectedOptionId, results })
      );
    } catch {}
  }, [currentIndex, selectedOptionId, results]);

  useEffect(() => {
    if (isCompleted && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
    }
  }, [isCompleted]);

  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [weakSpotDiagnosis, setWeakSpotDiagnosis] = useState<WeakSpotDiagnosis | null>(null);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);

  // Модальные окна
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  const currentQ = questions[currentIndex];
  const progressPct = ((currentIndex + (isAnswerSubmitted ? 1 : 0)) / questions.length) * 100;

  const handleSelectOption = (optId: string) => {
    if (isAnswerSubmitted || isVerifying) return;
    setSelectedOptionId(optId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isAnswerSubmitted || isVerifying) return;

    setIsVerifying(true);
    let verifiedResult: AnswerVerificationData | null = null;

    try {
      // 1. Попытка безопасной серверной проверки
      const res = await fetch("/api/quizzes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedOptionId: selectedOptionId,
          verificationToken: currentQ.verificationToken,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        verifiedResult = {
          isCorrect: Boolean(data.isCorrect),
          correctOptionId: data.correctOptionId || "",
          correctAnswer: data.correctAnswer || "",
          explanation: data.explanation || currentQ.explanation || "",
          distractorRationale: data.distractorRationale || currentQ.distractorRationale,
          sourceExcerpt: data.sourceExcerpt || currentQ.sourceExcerpt,
          sourcePage: data.sourcePage ?? currentQ.sourcePage,
        };
      }
    } catch {
      // Offline fallback
    } finally {
      setIsVerifying(false);
    }

    // 2. Локальный fallback, если сервер недоступен или для тестов
    if (!verifiedResult) {
      // Ищем выбранный текст
      let selectedText = selectedOptionId;
      for (const opt of currentQ.options) {
        if (typeof opt !== "string" && opt.id === selectedOptionId) {
          selectedText = opt.text;
          break;
        }
      }

      const cleanCorrect = (currentQ.correctAnswer || "").trim().toLowerCase();
      const isCorrect: boolean = Boolean(
        (currentQ.correctOptionId && selectedOptionId === currentQ.correctOptionId) ||
        (currentQ.correctAnswer && (selectedOptionId === currentQ.correctAnswer || (selectedText && selectedText.trim().toLowerCase() === cleanCorrect)))
      );

      verifiedResult = {
        isCorrect,
        correctOptionId: currentQ.correctOptionId || currentQ.correctAnswer || "",
        correctAnswer: currentQ.correctAnswer || selectedText || "",
        explanation: currentQ.explanation || "Объяснение подготовлено на основе материалов лекции.",
        distractorRationale: currentQ.distractorRationale,
        sourceExcerpt: currentQ.sourceExcerpt,
        sourcePage: currentQ.sourcePage,
      };
    }

    setAnswerData(verifiedResult);
    setIsAnswerSubmitted(true);

    const responseTimeMs = Math.max(
      100,
      Math.min(1000 * 60 * 60, Date.now() - questionStartAt)
    );
    let userAnswerText = selectedOptionId;
    for (const opt of currentQ.options) {
      if (typeof opt !== "string" && opt.id === selectedOptionId) {
        userAnswerText = opt.text;
        break;
      }
    }

    setResults((prev) => ({
      correctCount: prev.correctCount + (verifiedResult!.isCorrect ? 1 : 0),
      incorrectCount: prev.incorrectCount + (verifiedResult!.isCorrect ? 0 : 1),
      answers: [
        ...prev.answers,
        {
          question: currentQ,
          selected: selectedOptionId,
          isCorrect: verifiedResult!.isCorrect,
          responseTimeMs,
          userAnswerText,
        },
      ],
    }));
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
      setAnswerData(null);
    } else {
      setIsCompleted(true);
      if (results.correctCount / questions.length >= 0.7) {
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }

      // Сохранение результатов теста в серверную статистику
      const answersPayload = results.answers.map((a) => ({
        questionId: a.question.id,
        topicId: a.question.topicId,
        isCorrect: a.isCorrect,
        userAnswerText: a.userAnswerText,
        responseTimeMs: a.responseTimeMs,
      }));

      if (answersPayload.length > 0) {
        setIsSavingSession(true);
        fetch("/api/quizzes/record-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: questions[0]?.materialId,
            durationSeconds: Math.max(15, Math.round((Date.now() - sessionStartTime) / 1000)),
            answers: answersPayload,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setSessionSaved(true);
            }
          })
          .catch(() => {})
          .finally(() => setIsSavingSession(false));
      }

      // Клинический аудит ошибок и слабых мест от AI
      const incorrectList = results.answers
        .filter((a) => !a.isCorrect)
        .map((a) => ({
          prompt: a.question.prompt,
          selectedAnswerText: a.selected,
          correctAnswerText: a.question.correctAnswer,
          explanation: a.question.explanation,
          sourcePage: a.question.sourcePage,
        }));

      if (incorrectList.length > 0) {
        setIsLoadingDiagnosis(true);
        fetch("/api/quizzes/diagnose-weakness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicName: questions[0]?.topicName || "Медицинская тема",
            totalQuestions: questions.length,
            incorrectAnswers: incorrectList,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.diagnosis) {
              setWeakSpotDiagnosis(data.diagnosis);
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingDiagnosis(false));
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setAnswerData(null);
    setResults({ correctCount: 0, incorrectCount: 0, answers: [] });
    setIsCompleted(false);
    setSessionSaved(false);
    setWeakSpotDiagnosis(null);
    setIsLoadingDiagnosis(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isCompleted || !currentQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const optIds = currentQ.options.map((o, idx) => (typeof o === "string" ? o : o.id));
      const currentSelIdx = selectedOptionId ? optIds.indexOf(selectedOptionId) : -1;

      switch (e.key) {
        case 'ArrowUp':
          if (!isAnswerSubmitted && !isVerifying) {
            e.preventDefault();
            if (optIds.length === 0) break;
            const nextIdx = currentSelIdx <= 0 ? optIds.length - 1 : currentSelIdx - 1;
            setSelectedOptionId(optIds[nextIdx]);
          }
          break;
        case 'ArrowDown':
          if (!isAnswerSubmitted && !isVerifying) {
            e.preventDefault();
            if (optIds.length === 0) break;
            const nextIdx = currentSelIdx >= optIds.length - 1 ? 0 : currentSelIdx + 1;
            setSelectedOptionId(optIds[nextIdx]);
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!isAnswerSubmitted && !isVerifying && selectedOptionId) {
            handleSubmitAnswer();
          } else if (isAnswerSubmitted) {
            handleNextQuestion();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, currentQ, selectedOptionId, isAnswerSubmitted, isVerifying]);

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case "EASY":
        return "Легко";
      case "HARD":
        return "Сложно";
      default:
        return "Средне";
    }
  };

  // Экран результатов тестирования
  if (isCompleted) {
    const scorePct = Math.round((results.correctCount / questions.length) * 100);
    return (
      <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-w-0">
        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Score card (left on lg) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-ios-card text-center min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 truncate">Тест завершён 🎉</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{quizTitle}</p>

            {/* Индикатор сохранения статистики */}
            <div className="mt-3 flex justify-center">
              {sessionSaved ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Статистика обновлена в аналитике</span>
                </span>
              ) : isSavingSession ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>Сохранение результатов...</span>
                </span>
              ) : null}
            </div>

            {/* Большой процент правильных ответов */}
            <div className="my-5">
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {scorePct}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-bold text-emerald-600">{results.correctCount} правильных ответов</span> •{" "}
                <span className="font-bold text-rose-500">{results.incorrectCount} требуют повторения</span>
              </p>
            </div>

            {/* Рекомендации по результатам */}
            {results.incorrectCount === 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-left mb-4">
                <h4 className="text-xs font-bold text-emerald-900 mb-1 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Безупречное освоение темы!</span>
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Материал усвоен на 100%. Ты уверенно владеешь всеми клиническими понятиями этой темы.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleRestart}
                className="min-h-[48px] py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 ios-press min-w-0"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="truncate">Пройти заново</span>
              </button>
              <button
                onClick={onExit || (() => (window.location.href = "/"))}
                className="min-h-[48px] py-2.5 px-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm ios-press min-w-0"
              >
                <span className="truncate">На главную</span>
              </button>
            </div>
          </div>

          {/* Strong/Weak panel (right on lg) */}
          <div className="min-w-0">
            {/* Клинический диагноз слабых мест от AI */}
            {results.incorrectCount > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-left h-full">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center space-x-1.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="truncate">Клинический аудит слабых мест темы</span>
                  </h4>
                  {isLoadingDiagnosis && (
                    <span className="text-[10px] text-rose-600 font-semibold flex items-center space-x-1 shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>AI анализирует...</span>
                    </span>
                  )}
                </div>

                {weakSpotDiagnosis ? (
                  <div className="space-y-3">
                    <p className="text-xs text-rose-950 leading-relaxed font-medium">
                      {weakSpotDiagnosis.overallAssessment}
                    </p>

                    <div className="space-y-2 pt-1 max-h-[360px] overflow-y-auto pr-1">
                      {weakSpotDiagnosis.identifiedGaps.map((gap, idx) => (
                        <div
                          key={idx}
                          className="bg-white/90 p-3 rounded-xl border border-rose-100 shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-[11px] truncate min-w-0">
                              {gap.conceptName}
                            </span>
                            {gap.sourcePage && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 shrink-0">
                                стр. {gap.sourcePage}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-rose-700">
                            <span className="font-semibold">Где ошибка: </span>
                            {gap.misconception}
                          </p>

                          <p className="text-[11px] text-emerald-800">
                            <span className="font-semibold">Как на самом деле: </span>
                            {gap.correctPrinciple}
                          </p>

                          <p className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                            <span className="font-medium text-slate-600">Клиническое значение: </span>
                            {gap.clinicalRelevance}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-rose-200/60 flex items-center justify-between min-w-0">
                      <p className="text-[11px] text-rose-900 font-semibold truncate">
                        💡 {weakSpotDiagnosis.recommendedAction}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-800 leading-relaxed">
                    {isLoadingDiagnosis
                      ? "Искусственный интеллект сопоставляет выбранные ответы с правильными физиологическими каскадами..."
                      : "Обрати внимание на допущенные ошибки. Рекомендуем повторить соответствующие карточки."}
                  </p>
                )}
              </div>
            )}

            {results.incorrectCount === 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-left h-full">
                <h4 className="text-xs font-bold text-emerald-900 mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Сильные стороны</span>
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Все <strong>{results.correctCount}</strong> вопросов даны верно. Клиническое мышление по теме сформировано.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isCurrentCorrect = answerData?.isCorrect;
  const submitBtn = !isAnswerSubmitted ? (
    <button
      onClick={handleSubmitAnswer}
      disabled={!selectedOptionId || isVerifying}
      className="w-full min-h-[56px] py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 ios-press min-w-0"
    >
      {isVerifying ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-1.5 shrink-0" />
          <span className="truncate">Проверка ответа...</span>
        </>
      ) : (
        <span className="truncate">Проверить ответ</span>
      )}
    </button>
  ) : null;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-w-0">
      {/* Left column: question + options */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Верхний прогресс и заголовок (mobile only — в right aside на lg) */}
        <div className="lg:hidden flex items-center justify-between text-xs text-slate-500 px-1 mb-3">
          <span className="font-semibold text-teal-800 shrink-0">
            Вопрос {currentIndex + 1} из {questions.length}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium text-[11px] truncate max-w-[180px] min-w-0">
            {currentQ.topicName}
          </span>
        </div>

        {/* Индикатор прогресса (mobile only) */}
        <div className="lg:hidden w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-teal-600 rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Карточка вопроса */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card min-w-0"
            >
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-semibold uppercase mb-2 min-w-0">
                <span className="shrink-0">{getDifficultyLabel(currentQ.difficulty)}</span>
                <span className="shrink-0">•</span>
                <span className="truncate min-w-0">Тест с вариантами</span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {currentQ.prompt}
              </h3>

              {/* Варианты ответов */}
              <div className="mt-4 space-y-2.5 min-w-0">
                {currentQ.options.map((option, idx) => {
                  const optId = typeof option === "string" ? option : option.id;
                  const optText = typeof option === "string" ? option : option.text;
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOptionId === optId;

                  let optionStyle = "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-800";
                  let badgeStyle = "bg-slate-200/80 text-slate-700";

                  if (isAnswerSubmitted && answerData) {
                    const isCorrectOption =
                      optId === answerData.correctOptionId ||
                      optText.trim().toLowerCase() === answerData.correctAnswer.trim().toLowerCase();

                    if (isCorrectOption) {
                      optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
                      badgeStyle = "bg-emerald-600 text-white";
                    } else if (isSelected) {
                      optionStyle = "border-rose-400 bg-rose-50 text-rose-950 font-semibold";
                      badgeStyle = "bg-rose-500 text-white";
                    } else {
                      optionStyle = "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-teal-600 bg-teal-50/70 text-teal-950 shadow-2xs";
                    badgeStyle = "bg-teal-700 text-white";
                  }

                  return (
                    <button
                      key={optId || idx}
                      onClick={() => handleSelectOption(optId)}
                      disabled={isAnswerSubmitted || isVerifying}
                      className={`w-full min-h-[56px] rounded-2xl px-4 border text-left flex items-start space-x-3 transition-all ios-press min-w-0 ${optionStyle}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-[10px] ${badgeStyle}`}
                      >
                        {letter}
                      </span>
                      <span className="text-xs font-medium leading-relaxed py-[10px] truncate min-w-0">
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Desktop submit button (внутри карточки в flow) */}
              {!isAnswerSubmitted && (
                <div className="hidden lg:block mt-4 pt-2 min-w-0">
                  {submitBtn}
                </div>
              )}

              {/* Обратная связь после ответа */}
              {isAnswerSubmitted && answerData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-3.5 border-t border-slate-100 space-y-3 min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isCurrentCorrect ? (
                        <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Правильно!</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-rose-600 font-bold text-xs">
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Неверно</span>
                        </div>
                      )}
                    </div>

                    {/* Кнопки источника и объяснения */}
                    <div className="flex items-center space-x-2 flex-wrap min-w-0">
                      <button
                        onClick={() => setIsSourceOpen(true)}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 ios-press min-w-0"
                      >
                        <BookOpen className="w-3 h-3 shrink-0" />
                        <span className="truncate">Источник (стр. {answerData.sourcePage ?? currentQ.sourcePage})</span>
                      </button>

                      <button
                        onClick={() => setIsExplainOpen(true)}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 ios-press shrink-0"
                      >
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>Объяснить</span>
                      </button>
                    </div>
                  </div>

                  {/* Обоснование ответа */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed min-w-0">
                    <span className="font-bold text-slate-900 block mb-0.5">Почему?</span>
                    {answerData.explanation}
                  </div>

                  {/* Кнопка перехода к следующему вопросу */}
                  <button
                    onClick={handleNextQuestion}
                    className="w-full min-h-[56px] py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 ios-press min-w-0"
                  >
                    <span className="truncate">{currentIndex + 1 === questions.length ? "Посмотреть результаты" : "Следующий вопрос"}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile sticky submit container */}
        {!isAnswerSubmitted && (
          <div className="lg:hidden sticky bottom-0 pb-safe-bottom pt-3 mt-auto bg-gradient-to-t from-white via-white/90 to-transparent -mx-3 px-3 z-10">
            {submitBtn}
          </div>
        )}
      </div>

      {/* Right aside: lg+ only info panel */}
      <aside className="hidden lg:block w-[320px] xl:w-96 shrink-0 border-l border-slate-200 pl-6 space-y-4 min-w-0">
        {/* Progress card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
          <div className="text-sm font-bold text-slate-900 mb-2 truncate">
            Вопрос {currentIndex + 1} из {questions.length}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-teal-600 rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{Math.round(progressPct)}% завершено</span>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 font-semibold">
              {getDifficultyLabel(currentQ.difficulty)}
            </span>
          </div>
        </div>

        {/* Topic summary card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
            Тема теста
          </div>
          <div className="text-sm font-bold text-slate-900 mb-2 truncate min-w-0">
            {quizTitle}
          </div>
          <div className="text-[11px] text-slate-500 mb-3 truncate min-w-0">
            Подтема: <span className="font-semibold text-slate-700">{currentQ.topicName}</span>
          </div>
          {/* Mini mastery pill mock */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span className="text-[11px] font-bold text-teal-700">Мастерство 68%</span>
          </div>
        </div>

        {/* Source excerpt: only when submitted */}
        {isAnswerSubmitted && answerData?.sourceExcerpt && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase flex items-center space-x-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Выдержка из источника</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded-md bg-slate-100 shrink-0">
                стр. {answerData.sourcePage ?? currentQ.sourcePage}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed italic">
              «{answerData.sourceExcerpt}»
            </p>
            {currentQ.materialTitle && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 truncate">
                Источник: <span className="font-medium">{currentQ.materialTitle}</span>
              </div>
            )}
          </div>
        )}

        {/* Source material title + file info block */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
            Учебный материал
          </div>
          <div className="text-xs font-bold text-slate-800 truncate min-w-0">
            {currentQ.materialTitle || "Лекция по медицинской теме"}
          </div>
          <div className="mt-2 flex items-center space-x-1.5 text-[10px] text-slate-500">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span className="truncate">Страница {answerData?.sourcePage ?? currentQ.sourcePage}</span>
          </div>
        </div>
      </aside>

      {/* Модальные окна */}
      <SourceCitationModal
        isOpen={isSourceOpen}
        onClose={() => setIsSourceOpen(false)}
        materialTitle={currentQ.materialTitle}
        sourcePage={answerData?.sourcePage ?? currentQ.sourcePage}
        sourceExcerpt={answerData?.sourceExcerpt || currentQ.sourceExcerpt || ""}
      />

      <AIExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        questionPrompt={currentQ.prompt}
        correctAnswer={answerData?.correctAnswer || currentQ.correctAnswer || ""}
        sourceExcerpt={answerData?.sourceExcerpt || currentQ.sourceExcerpt || ""}
      />
    </div>
  );
}
