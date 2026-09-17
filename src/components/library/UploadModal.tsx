"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setErrorMsg("Размер файла превышает лимит 50 МБ.");
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-ios-elevated max-h-[90dvh] overflow-y-auto"
        >
          {/* Шапка модального окна */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
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
            <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isProcessing ? (
            <div className="mt-4 space-y-4">
              {/* Зона выбора файла */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-200 hover:border-teal-400 bg-teal-50/30 rounded-3xl p-6 text-center cursor-pointer transition-colors ios-press"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-2.5">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[260px] mx-auto">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-teal-700 font-semibold mt-0.5 block">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ • Нажмите для замены
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Нажмите для выбора медицинского файла
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Поддерживаются лекции, методички, презентации и конспекты
                    </span>
                  </div>
                )}
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

              {/* Кнопка запуска */}
              <button
                onClick={handleUploadAndAnalyze}
                disabled={!selectedFile}
                className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-md shadow-teal-700/10 transition-all flex items-center justify-center space-x-2 ios-press"
              >
                <Sparkles className="w-4 h-4" />
                <span>Обработать и проанализировать материал</span>
              </button>
            </div>
          ) : (
            /* Экран анализа с пошаговыми статусами */
            <div className="mt-6 py-2 space-y-4">
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

              <div className="space-y-3 px-2">
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
