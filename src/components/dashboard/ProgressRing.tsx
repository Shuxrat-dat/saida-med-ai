"use client";

import { motion } from "framer-motion";

interface ProgressRingProps {
  percentage: number;
  completedQuestions: number;
  totalGoal: number;
}

export function ProgressRing({
  percentage,
  completedQuestions,
  totalGoal,
}: ProgressRingProps) {
  const radius = 52;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider block">
            Цель на сегодня
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-0.5">
            {percentage}% <span className="text-xs font-medium text-slate-500">выполнено</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-800">{completedQuestions}</span> из{" "}
            <span>{totalGoal} вопросов изучено</span>
          </p>
          <div className="mt-3 flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              Зона высокой фиксации знаний
            </span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <svg className="w-28 h-28 transform -rotate-90">
            {/* Фоновое кольцо */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-100"
              fill="transparent"
            />
            {/* Анимированное кольцо прогресса */}
            <motion.circle
              cx="56"
              cy="56"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-teal-600"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-extrabold text-slate-900">{percentage}%</span>
            <span className="text-[10px] text-slate-400 font-medium -mt-1">Темп</span>
          </div>
        </div>
      </div>
    </div>
  );
}
