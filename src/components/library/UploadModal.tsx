"use client";

import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, CheckCircle2, Loader2, Sparkles, AlertCircle, Camera, FileUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (material: any) => void;
}

const PROCESSING_STEPS = [
  "Читаем ваш материал",
  "Извлекаем текст и сохраняем номера страниц",
  "Определяем анатомические и клинические темы",
  "Строим структурированную карту знаний",
  "Материал готов к изучению",
];

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("Общая медицина");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    prevFocusRef.current = document.activeElement as HTMLElement;
    window.addEventListener("keydown", handleKey);
    const focusables = modalRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
    focusables?.[0]?.focus();
    return () => {
      window.removeEventListener("keydown", handleKey);
      prevFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find((i) => i.type.startsWith("image/"));
      if (imgItem) {
        const f = imgItem.getAsFile();
        if (f) handleSingleFile(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSingleFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg("Размер файла превышает лимит 50 МБ.");
      return;
    }
    setSelectedFile(file);
    setErrorMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSingleFile(file);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setCurrentStepIndex(0);

    // Таймер шагов анализа
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subject", subject);

      const res = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Не удалось обработать файл");
      }

      const data = await res.json();
      setCurrentStepIndex(4); // "Материал готов к изучению"

      setTimeout(() => {
        setIsProcessing(false);
        onUploadSuccess(data.material);
        onClose();
      }, 1000);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsProcessing(false);
      setErrorMsg(err.message || "Произошла ошибка при анализе материала. Попробуйте снова.");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          ref={modalRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-ios-elevated max-h-[92dvh] md:max-h-[85vh] overflow-y-auto flex flex-col safe-area-top safe-area-bottom"
        >
          {/* Шапка модального окна */}
          <div className="sticky top-0 z-10 bg-white pb-3 pt-4 px-6 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Загрузить учебный материал</h3>
              <p className="text-xs text-slate-500">PDF, DOCX, PPTX, TXT или фото конспектов</p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Закрыть"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 px-6">
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {!isProcessing ? (
            <>
              <div className="mt-4 px-6 space-y-4 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-teal-300 bg-teal-50/60 hover:bg-teal-50 rounded-3xl p-6 text-center cursor-pointer transition-colors ios-press"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2.5">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate max-w-[260px] mx-auto">
                        {selectedFile.name}
                      </span>
                      <span className="text-[11px] text-teal-700 font-semibold mt-0.5 block">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ • Нажмите для замены
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleSingleFile(f); }}
                    className={`w-full border-2 border-dashed rounded-3xl p-6 md:p-10 text-center transition-colors duration-200 transition-transform hidden md:block ${
                      dragging
                        ? "border-teal-500 bg-teal-50 scale-[1.01]"
                        : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <UploadCloud className="w-7 h-7 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <span className="text-lg md:text-lg font-bold text-slate-800 block">
                        Перетащите файл сюда
                      </span>
                      <span className="text-xs text-slate-500 mt-2 block max-w-md mx-auto">
                        PDF, DOCX, PPTX, TXT или изображения (JPG, PNG, WEBP)
                      </span>
                    </div>
                    <div className="flex items-center my-4 md:my-5">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="px-3 text-xs font-medium text-slate-400">или</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="inline-block px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-700/10 transition-colors"
                    >
                      Выбрать файл с устройства
                    </button>
                  </div>
                )}

                {!selectedFile && (
                  <p className="hidden md:block text-center text-xs text-slate-500 mt-2">
                    💡 Совет: можно вставить скриншот через Ctrl+V / Cmd+V
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors ios-press min-h-[72px]"
                  >
                    <Camera className="w-5 h-5 text-slate-600" />
                    <span className="text-xs font-semibold">Камера</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors ios-press min-h-[72px]"
                  >
                    <FileUp className="w-5 h-5 text-slate-600" />
                    <span className="text-xs font-semibold">Загрузить файл</span>
                  </button>
                </div>

                {/* Выбор дисциплины */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Дисциплина / Раздел медицины
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="Общая медицина">Общая медицина</option>
                    <option value="Кардиология">Кардиология / Гемодинамика</option>
                    <option value="Фармакология">Фармакология и рецепторы</option>
                    <option value="Пульмонология">Пульмонология и дыхание</option>
                    <option value="Неврология">Неврология и нейроанатомия</option>
                    <option value="Патология">Патология и гистология</option>
                  </select>
                </div>
              </div>

              {/* Sticky Footer: кнопка запуска */}
              <div className="sticky bottom-0 z-10 bg-white pt-3 pb-4 px-6 border-t border-slate-100 safe-area-bottom">
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={!selectedFile}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-md shadow-teal-700/10 transition-all flex items-center justify-center space-x-2 ios-press"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Обработать и проанализировать материал</span>
                </button>
              </div>
            </>
          ) : (
            /* Экран анализа с пошаговыми статусами */
            <div className="mt-6 py-2 px-6 space-y-4 flex-1">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Анализируем {selectedFile?.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Структурируем учебный материал...
                </p>
              </div>

              <div className="space-y-3">
                {PROCESSING_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={idx} className="flex items-center space-x-3 text-xs">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        </div>
                      )}
                      <span
                        className={`font-medium ${
                          isDone
                            ? "text-slate-800"
                            : isCurrent
                            ? "text-teal-900 font-bold"
                            : "text-slate-400"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
