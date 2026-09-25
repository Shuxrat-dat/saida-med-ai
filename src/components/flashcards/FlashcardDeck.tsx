"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw,
  Award,
  Layers,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { MockFlashcard } from "@/lib/db/mock-data";

interface FlashcardDeckProps {
  initialCards: MockFlashcard[];
}

export function FlashcardDeck({ initialCards }: FlashcardDeckProps) {
  const SESSION_KEY = 'flashcards_session_backup_v1';

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

  const [cards] = useState<MockFlashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const v = backup?.currentIndex;
    return typeof v === 'number' && v >= 0 && v < (initialCards?.length ?? 1) ? v : 0;
  });
  const [isFlipped, setIsFlipped] = useState<boolean>(() => {
    const v = backup?.isFlipped;
    return typeof v === 'boolean' ? v : false;
  });
  const [reviewedCount, setReviewedCount] = useState(0);
  const touchStart = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ currentIndex, isFlipped })
      );
    } catch {}
  }, [currentIndex, isFlipped]);

  const clearBackup = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {}
    }
  };

  useEffect(() => {
    if (currentIndex >= cards.length) {
      clearBackup();
    }
  }, [currentIndex, cards.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (cards.length === 0 || currentIndex >= cards.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentIndex((c) => Math.max(0, c - 1));
          setIsFlipped(false);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (isFlipped) {
            handleRateCard('GOOD');
          } else {
            setCurrentIndex((c) => Math.min(cards.length - 1, c + 1));
            setIsFlipped(false);
          }
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          setIsFlipped((f) => !f);
          break;
        case '1':
          if (isFlipped) handleRateCard('AGAIN');
          break;
        case '2':
          if (isFlipped) handleRateCard('HARD');
          break;
        case '3':
          if (isFlipped) handleRateCard('GOOD');
          break;
        case '4':
          if (isFlipped) handleRateCard('EASY');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, currentIndex, isFlipped]);

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-w-0 justify-center">
        <div className="flex-1 min-w-0 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-100 shadow-ios-card text-center my-6 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-3">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate">Все карточки на сегодня повторены! 🎉</h3>
            <p className="text-xs text-slate-500 mt-1">
              Вы повторили <strong>{reviewedCount}</strong> карточек в этой сессии. Интервалы повторения пересчитаны по алгоритму SuperMemo SM-2.
            </p>
            <button
              onClick={() => {
                clearBackup();
                setCurrentIndex(0);
                setIsFlipped(false);
                setReviewedCount(0);
              }}
              className="mt-5 min-h-[48px] py-2.5 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm ios-press min-w-0"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="truncate">Повторить колоду снова</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPct = ((currentIndex + 1) / cards.length) * 100;

  const handleRateCard = async (rating: "AGAIN" | "HARD" | "GOOD" | "EASY") => {
    try {
      await fetch(`/api/flashcards/${currentCard.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
    } catch {}

    setIsFlipped(false);
    setReviewedCount((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);
  };

  const ratingButtons = isFlipped ? (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full grid grid-cols-4 lg:inline-flex lg:flex-row lg:justify-center gap-2 lg:gap-3 lg:pt-3 pt-1 min-w-0"
    >
      <button
        onClick={() => handleRateCard("AGAIN")}
        className="relative min-h-[52px] lg:h-12 lg:px-5 p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 text-rose-800 text-center ios-press min-w-0 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:space-x-1"
      >
        <span className="text-xs font-bold block truncate">Снова</span>
        <span className="text-[10px] text-rose-600 hidden lg:inline">· 1 дн.</span>
        <span className="text-[10px] text-rose-600 lg:hidden block">1 дн.</span>
        <span className="hidden lg:block absolute bottom-0.5 right-1 text-[10px] opacity-60 font-bold">1</span>
      </button>

      <button
        onClick={() => handleRateCard("HARD")}
        className="relative min-h-[52px] lg:h-12 lg:px-5 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 text-amber-800 text-center ios-press min-w-0 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:space-x-1"
      >
        <span className="text-xs font-bold block truncate">Трудно</span>
        <span className="text-[10px] text-amber-600 hidden lg:inline">· 2 дн.</span>
        <span className="text-[10px] text-amber-600 lg:hidden block">2 дн.</span>
        <span className="hidden lg:block absolute bottom-0.5 right-1 text-[10px] opacity-60 font-bold">2</span>
      </button>

      <button
        onClick={() => handleRateCard("GOOD")}
        className="relative min-h-[52px] lg:h-12 lg:px-5 p-3 rounded-2xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200/60 text-teal-900 text-center ios-press min-w-0 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:space-x-1"
      >
        <span className="text-xs font-bold block truncate">Хорошо</span>
        <span className="text-[10px] text-teal-700 hidden lg:inline">· 4 дн.</span>
        <span className="text-[10px] text-teal-700 lg:hidden block">4 дн.</span>
        <span className="hidden lg:block absolute bottom-0.5 right-1 text-[10px] opacity-60 font-bold">3</span>
      </button>

      <button
        onClick={() => handleRateCard("EASY")}
        className="relative min-h-[52px] lg:h-12 lg:px-5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 text-emerald-900 text-center ios-press min-w-0 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:space-x-1"
      >
        <span className="text-xs font-bold block truncate">Легко</span>
        <span className="text-[10px] text-emerald-700 hidden lg:inline">· 7 дн.</span>
        <span className="text-[10px] text-emerald-700 lg:hidden block">7 дн.</span>
        <span className="hidden lg:block absolute bottom-0.5 right-1 text-[10px] opacity-60 font-bold">4</span>
      </button>
    </motion.div>
  ) : (
    <div className="text-center py-2 text-xs text-slate-400 font-medium min-w-0">
      Нажмите на карточку выше, чтобы увидеть правильный ответ
    </div>
  );

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1 min-w-0 justify-center">
      {/* Center column: progress mobile + card + rating */}
      <div className="flex-1 min-w-0 flex flex-col items-center">
        {/* Mobile: compact progress 1 line */}
        <div className="lg:hidden w-full space-y-3 mb-2 min-w-0">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 min-w-0 gap-2">
            <span className="font-semibold text-indigo-900 shrink-0">
              Карточка {currentIndex + 1} из {cards.length}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[11px] truncate max-w-[180px] min-w-0">
              {currentCard.topicName}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Card container: responsive centered max-width + min-height */}
        <div className="w-full sm:max-w-md lg:max-w-lg mx-auto min-w-0">
          {/* 3D Карточка с переворотом */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              const dx = t.clientX - touchStart.current.x;
              const dy = t.clientY - touchStart.current.y;
              const adx = Math.abs(dx);
              const ady = Math.abs(dy);
              if (adx > 60 && adx > ady) {
                if (dx > 0) {
                  setCurrentIndex((c) => Math.max(0, c - 1));
                } else {
                  setCurrentIndex((c) => Math.min(cards.length - 1, c + 1));
                }
                setIsFlipped(false);
              } else if (dy < -80 && adx < 40) {
                setIsFlipped((f) => !f);
              } else if (dy > 80 && adx < 40) {
                setIsFlipped(false);
              }
            }}
            className="w-full min-h-[300px] sm:min-h-[340px] lg:min-h-[380px] cursor-pointer perspective-1000 ios-press"
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="relative w-full min-h-[300px] sm:min-h-[340px] lg:min-h-[380px] rounded-3xl p-4 sm:p-6 shadow-ios-elevated border border-slate-100 flex flex-col justify-between"
              style={{
                transformStyle: "preserve-3d",
                backgroundColor: isFlipped ? "#f8fafc" : "#ffffff",
              }}
            >
              {/* Лицевая сторона */}
              <div
                className={`w-full flex-1 flex flex-col justify-between ${
                  isFlipped ? "hidden" : "block"
                } min-w-0`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold gap-2 min-w-0">
                  <span className="flex items-center space-x-1 shrink-0">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    <span>Вопрос / Термин</span>
                  </span>
                  <span className="text-slate-400 truncate min-w-0">Нажмите для ответа</span>
                </div>

                <div className="my-auto py-4 sm:py-6 text-center min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
                    {currentCard.front}
                  </h3>
                </div>

                <div className="text-center min-w-0">
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block truncate max-w-full">
                    Нажмите, чтобы перевернуть
                  </span>
                </div>
              </div>

              {/* Обратная сторона */}
              <div
                className={`w-full flex-1 flex flex-col justify-between ${
                  isFlipped ? "block" : "hidden"
                } min-w-0`}
                style={{ transform: "rotateY(180deg)" }}
              >
                <div className="flex items-center justify-between text-[11px] text-teal-700 font-semibold gap-2 min-w-0">
                  <span className="flex items-center space-x-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate min-w-0">Целевой ответ и суть</span>
                  </span>
                  <span className="shrink-0">стр. {currentCard.sourcePage}</span>
                </div>

                <div className="my-auto py-4 min-w-0">
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed text-center break-words">
                    {currentCard.back}
                  </p>

                  {currentCard.sourceExcerpt && (
                    <div className="mt-4 p-3 rounded-2xl bg-white border border-slate-200/60 text-[11px] text-slate-600 italic min-w-0">
                      «{currentCard.sourceExcerpt}»
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400 min-w-0">
                  Оцените воспоминание для интервального повторения:
                </div>
              </div>
            </motion.div>
          </div>

          {/* Rating buttons (below card, mobile & desktop) */}
          <div className="mt-4 min-w-0">
            {ratingButtons}
          </div>

          <div className="hidden sm:block text-[11px] text-slate-400 mt-2 text-center">
            ← → навигация · Space перевернуть · 1/2/3/4 оценка
          </div>
        </div>
      </div>

      {/* Right aside: lg+ due topics list w-72 + detailed progress */}
      <aside className="hidden lg:block w-72 shrink-0 space-y-4 min-w-0">
        {/* Progress info: detailed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0 gap-2">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase shrink-0">
              Прогресс сессии
            </h4>
            <span className="text-xs font-bold text-indigo-700 shrink-0">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="text-slate-500 font-semibold">Повторено</div>
              <div className="font-bold text-indigo-700 text-sm">{reviewedCount}</div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-slate-500 font-semibold">Осталось</div>
              <div className="font-bold text-emerald-700 text-sm">{cards.length - currentIndex - 1}</div>
            </div>
          </div>
        </div>

        {/* Topic & source card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
            Тема карточки
          </div>
          <div className="text-sm font-bold text-slate-900 mb-2 truncate min-w-0">
            {currentCard.topicName}
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mb-3 min-w-0">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span className="truncate min-w-0">стр. {currentCard.sourcePage}</span>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-[11px] font-bold text-indigo-700">Due сегодня</span>
          </div>
        </div>

        {/* Due list: next cards */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm min-w-0">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-3">
            Следующие ({Math.min(5, cards.length - currentIndex - 1)})
          </h4>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {cards.slice(currentIndex + 1, currentIndex + 6).map((c, i) => (
              <div
                key={c.id + i}
                className="p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-0"
              >
                <p className="text-[11px] font-semibold text-slate-700 truncate min-w-0">
                  {c.front}
                </p>
                <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-400">
                  <span>стр. {c.sourcePage}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-semibold">
                    {c.topicName?.split(" ").slice(0, 1).join("")}
                  </span>
                </div>
              </div>
            ))}
            {cards.length - currentIndex - 1 === 0 && (
              <p className="text-[11px] text-slate-400 italic text-center py-2">
                Последняя карточка
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
