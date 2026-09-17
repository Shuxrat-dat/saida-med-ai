"use client";

import Link from "next/link";
import { ArrowRight, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";

export function ContinueStudyCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white rounded-3xl p-5 shadow-ios-elevated relative overflow-hidden"
    >
      {/* Декоративное свечение */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-medium">
          <HeartPulse className="w-3.5 h-3.5 text-teal-300" />
          <span>Текущий модуль</span>
        </span>
        <span className="text-[11px] text-teal-300/80 font-medium">Сердечно-сосудистая система</span>
      </div>

      <h4 className="text-lg font-bold tracking-tight text-white">
        Проводящая система и клапаны сердца
      </h4>
      <p className="text-xs text-teal-100/70 mt-1 max-w-[280px]">
        Осталось повторить: 12 важных вопросов. Готова к сессии активного воспоминания?
      </p>

      <div className="mt-4 flex items-center justify-between pt-2 border-t border-teal-700/50">
        <span className="text-xs text-teal-200/90 font-medium">Примерное время: ~6 мин</span>
        <Link
          href="/quiz?topicId=top-cvs-conduction"
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-semibold shadow-sm transition-all ios-press"
        >
          <span>Продолжить</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
