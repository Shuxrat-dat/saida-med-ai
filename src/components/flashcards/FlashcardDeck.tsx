"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw,
  Award,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { MockFlashcard } from "@/lib/db/mock-data";

interface FlashcardDeckProps {
  initialCards: MockFlashcard[];
}

export function FlashcardDeck({ initialCards }: FlashcardDeckProps) {
  const [cards] = useState<MockFlashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-ios-card text-center my-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-3">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Все карточки на сегодня повторены! 🎉</h3>
        <p className="text-xs text-slate-500 mt-1">
          Вы повторили {reviewedCount} карточек в этой сессии. Интервалы повторения пересчитаны по алгоритму SuperMemo SM-2.
        </p>
        <button
          onClick={() => {
            setCurrentIndex(0);
            setIsFlipped(false);
            setReviewedCount(0);
          }}
          className="mt-5 py-2.5 px-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm ios-press"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить колоду снова</span>
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

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

  return (
    <div className="space-y-4">
      {/* Верхний заголовок и прогресс */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span className="font-semibold text-indigo-900">
          Карточка {currentIndex + 1} из {cards.length}
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[11px] truncate max-w-[180px]">
          {currentCard.topicName}
        </span>
      </div>

      {/* Индикатор прогресса */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* 3D Карточка с переворотом */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[300px] cursor-pointer perspective-1000 ios-press"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="relative w-full min-h-[300px] rounded-3xl p-6 shadow-ios-elevated border border-slate-100 flex flex-col justify-between"
          style={{
            transformStyle: "preserve-3d",
            backgroundColor: isFlipped ? "#f8fafc" : "#ffffff",
          }}
        >
          {/* Лицевая сторона */}
          <div
            className={`w-full flex-1 flex flex-col justify-between ${
              isFlipped ? "hidden" : "block"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center space-x-1">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>Вопрос / Термин</span>
              </span>
              <span className="text-slate-400">Нажмите для ответа</span>
            </div>

            <div className="my-auto py-6 text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentCard.front}
              </h3>
            </div>

            <div className="text-center">
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Нажмите, чтобы перевернуть
              </span>
            </div>
          </div>

          {/* Обратная сторона */}
          <div
            className={`w-full flex-1 flex flex-col justify-between ${
              isFlipped ? "block" : "hidden"
            }`}
            style={{ transform: "rotateY(180deg)" }}
          >
            <div className="flex items-center justify-between text-[11px] text-teal-700 font-semibold">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Целевой ответ и суть</span>
              </span>
              <span>Страница {currentCard.sourcePage}</span>
            </div>

            <div className="my-auto py-4">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed text-center">
                {currentCard.back}
              </p>

              {currentCard.sourceExcerpt && (
                <div className="mt-4 p-3 rounded-2xl bg-white border border-slate-200/60 text-[11px] text-slate-600 italic">
                  «{currentCard.sourceExcerpt}»
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-slate-400">
              Оцените воспоминание для интервального повторения:
            </div>
          </div>
        </motion.div>
      </div>

      {/* Кнопки оценки SM-2 */}
      {isFlipped ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2 pt-1"
        >
          <button
            onClick={() => handleRateCard("AGAIN")}
            className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 text-rose-800 text-center ios-press"
          >
            <span className="text-xs font-bold block">Снова</span>
            <span className="text-[10px] text-rose-600">1 дн.</span>
          </button>

          <button
            onClick={() => handleRateCard("HARD")}
            className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60 text-amber-800 text-center ios-press"
          >
            <span className="text-xs font-bold block">Трудно</span>
            <span className="text-[10px] text-amber-600">2 дн.</span>
          </button>

          <button
            onClick={() => handleRateCard("GOOD")}
            className="p-3 rounded-2xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200/60 text-teal-900 text-center ios-press"
          >
            <span className="text-xs font-bold block">Хорошо</span>
            <span className="text-[10px] text-teal-700">4 дн.</span>
          </button>

          <button
            onClick={() => handleRateCard("EASY")}
            className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 text-emerald-900 text-center ios-press"
          >
            <span className="text-xs font-bold block">Легко</span>
            <span className="text-[10px] text-emerald-700">7 дн.</span>
          </button>
        </motion.div>
      ) : (
        <div className="text-center py-2 text-xs text-slate-400 font-medium">
          Нажмите на карточку выше, чтобы увидеть правильный ответ
        </div>
      )}
    </div>
  );
}
