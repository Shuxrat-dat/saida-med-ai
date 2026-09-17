"use client";

import { X, BookOpen, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SourceCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialTitle: string;
  sourcePage: number;
  sourceExcerpt: string;
}

export function SourceCitationModal({
  isOpen,
  onClose,
  materialTitle,
  sourcePage,
  sourceExcerpt,
}: SourceCitationModalProps) {
  if (!isOpen) return null;

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
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Подтверждение источником</h3>
                <p className="text-[10px] text-slate-400">Прямая цитата из вашего учебного материала</p>
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

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                {materialTitle}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">
                Страница {sourcePage}
              </span>
            </div>

            <div className="relative p-4 rounded-2xl bg-teal-50/40 border border-teal-100 text-slate-700 text-xs leading-relaxed italic">
              <Quote className="w-5 h-5 text-teal-300 absolute top-2.5 left-2.5 opacity-60 pointer-events-none" />
              <p className="relative pl-3 text-slate-800 font-normal">
                «{sourceExcerpt}»
              </p>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Все вопросы сгенерированы строго на основе ваших лекций для исключения галлюцинаций.
            </p>
          </div>

          <div className="mt-5">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-sm ios-press"
            >
              Закрыть источник
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
