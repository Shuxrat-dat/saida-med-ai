"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Save, FileText, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

interface OcrPage {
  pageNumber: number;
  text: string;
  qualityScore?: number;
}

interface OcrEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
  initialPages: OcrPage[];
  onSaveSuccess?: (updatedPages: OcrPage[]) => void;
}

export function OcrEditorModal({
  isOpen,
  onClose,
  materialId,
  materialTitle,
  initialPages,
  onSaveSuccess,
}: OcrEditorModalProps) {
  const [pages, setPages] = useState<OcrPage[]>(initialPages);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || pages.length === 0) return null;

  const currentPage = pages[activePageIndex] || pages[0];

  const handleTextChange = (newText: string) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, text: newText } : p
      )
    );
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/materials/${materialId}/pages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });

      if (!res.ok) {
        throw new Error("Не удалось сохранить изменения текста");
      }

      setSavedSuccess(true);
      if (onSaveSuccess) onSaveSuccess(pages);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = currentPage.text.split(/\s+/).filter(Boolean).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-ios-elevated max-h-[92dvh] flex flex-col"
        >
          {/* Шапка модального окна */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="min-w-0 pr-2">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-teal-700 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Распознанный текст OCR</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {materialTitle}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Пагинатор страниц */}
          <div className="py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              {pages.map((p, idx) => (
                <button
                  key={p.pageNumber}
                  onClick={() => setActivePageIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ios-press shrink-0 ${
                    idx === activePageIndex
                      ? "bg-teal-700 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Стр. {p.pageNumber}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1 pl-2">
              <button
                disabled={activePageIndex === 0}
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded-xl border border-slate-200 disabled:opacity-30 ios-press"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <button
                disabled={activePageIndex === pages.length - 1}
                onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                className="p-1.5 rounded-xl border border-slate-200 disabled:opacity-30 ios-press"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>

          {/* Тело редактора текста */}
          <div className="py-3 flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Страница {currentPage.pageNumber} из {pages.length}</span>
              <span>{wordCount} слов • {currentPage.text.length} символов</span>
            </div>

            <textarea
              value={currentPage.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Текст страницы..."
              className="w-full flex-1 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none font-mono"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold mb-2">{errorMsg}</p>
          )}

          {/* Подвал с кнопками */}
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1.5 ios-press disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохраняем...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Сохранено!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors ios-press"
            >
              Готово
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
