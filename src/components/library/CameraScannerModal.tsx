"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Loader2,
  FileText,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { ImagePreprocessor } from "@/lib/utils/image-preprocessing";
import { MockMaterial } from "@/lib/db/mock-data";
import { OcrEditorModal } from "./OcrEditorModal";

interface ScannedPageItem {
  id: string;
  pageNumber: number;
  file: File;
  previewUrl: string;
  sizeBytes: number;
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (material: MockMaterial) => void;
}

const REAL_PROCESSING_STAGES = [
  "Загружаем фотографии на сервер",
  "Распознаём медицинский текст (OCR)",
  "Проверяем качество распознавания и терминологию",
  "Извлекаем структуру и заголовки материала",
  "Определяем клинические и экзаменационные темы",
  "Извлекаем понятия и проверяемые факты",
  "Строим структурированную карту знаний",
  "Подготавливаем материал для AI-тестирования",
];

export function CameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: CameraScannerModalProps) {
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [materialTitle, setMaterialTitle] = useState<string>("");
  const [subject, setSubject] = useState<string>("Общая медицина");

  // Обработка
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [createdMaterial, setCreatedMaterial] = useState<MockMaterial | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Редактор OCR
  const [isOcrEditorOpen, setIsOcrEditorOpen] = useState(false);

  // Референс на скрытый системный инпут камеры
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const retakeInputRef = useRef<HTMLInputElement>(null);
  const retakeTargetIndex = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Сброс и закрытие
  const handleCloseAll = () => {
    setPages([]);
    setIsProcessing(false);
    setCreatedMaterial(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseAll();
    };
    prevFocusRef.current = document.activeElement as HTMLElement;
    window.addEventListener("keydown", handleKey);
    const focusables = modalRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
    focusables?.[0]?.focus();
    return () => {
      window.removeEventListener("keydown", handleKey);
      prevFocusRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // Открытие камеры для нового снимка
  const handleTriggerCamera = () => {
    ImagePreprocessor.triggerHaptic(15);
    cameraInputRef.current?.click();
  };

  // Обработка выбранного/снятого фото
  const handleCaptureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      ImagePreprocessor.triggerHaptic(20);
      const newPageNumber = pages.length + 1;
      const preprocessed = await ImagePreprocessor.preprocessImage(file, newPageNumber);

      const newItem: ScannedPageItem = {
        id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pageNumber: newPageNumber,
        file: preprocessed.file,
        previewUrl: preprocessed.previewUrl,
        sizeBytes: preprocessed.sizeBytes,
      };

      setPages((prev) => [...prev, newItem]);
      setActivePreviewIndex(pages.length);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Не удалось обработать снимок.");
    } finally {
      // Сброс инпута
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  // Пересъёмка конкретной страницы
  const handleTriggerRetake = (index: number) => {
    retakeTargetIndex.current = index;
    ImagePreprocessor.triggerHaptic(15);
    retakeInputRef.current?.click();
  };

  const handleRetakeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetIdx = retakeTargetIndex.current;
    if (!file || targetIdx === null) return;

    try {
      ImagePreprocessor.triggerHaptic(20);
      const preprocessed = await ImagePreprocessor.preprocessImage(file, targetIdx + 1);

      setPages((prev) =>
        prev.map((item, idx) =>
          idx === targetIdx
            ? {
                ...item,
                file: preprocessed.file,
                previewUrl: preprocessed.previewUrl,
                sizeBytes: preprocessed.sizeBytes,
              }
            : item
        )
      );
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Не удалось обновить снимок.");
    } finally {
      if (retakeInputRef.current) retakeInputRef.current.value = "";
      retakeTargetIndex.current = null;
    }
  };

  // Удаление страницы
  const handleDeletePage = (index: number) => {
    ImagePreprocessor.triggerHaptic(25);
    setPages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      // Пересчёт номеров страниц
      return filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
    setActivePreviewIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
  };

  // Перемещение страницы вверх / вниз
  const handleMovePage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    ImagePreprocessor.triggerHaptic(10);
    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
    setActivePreviewIndex(targetIndex);
  };

  // Запуск реальной обработки
  const handleStartProcessing = async () => {
    if (pages.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setCurrentStageIndex(0);

    // Таймер визуального отображения этапов бэкенд-пайплайна
    const stageTimer = setInterval(() => {
      setCurrentStageIndex((prev) => (prev < 6 ? prev + 1 : prev));
    }, 1400);

    try {
      const formData = new FormData();
      formData.append("pagesCount", pages.length.toString());
      formData.append("subject", subject);
      if (materialTitle.trim()) {
        formData.append("title", materialTitle.trim());
      }

      // Добавление каждого оптимизированного изображения
      pages.forEach((p, idx) => {
        formData.append(`page_${idx + 1}`, p.file);
      });

      const res = await fetch("/api/materials/camera-upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(stageTimer);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ошибка обработки снимков.");
      }

      const data = await res.json();
      setCurrentStageIndex(7); // Финальная стадия: "Подготавливаем материал для AI"

      setTimeout(() => {
        setCreatedMaterial(data.material);
        onScanSuccess(data.material);
      }, 900);
    } catch (err: any) {
      clearInterval(stageTimer);
      setIsProcessing(false);
      setErrorMsg(err.message || "Не удалось распознать страницы. Попробуйте снова.");
    }
  };

  const activePage = pages[activePreviewIndex] || pages[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm">
        {/* Скрытые нативные инпуты камеры */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCaptureFile}
          className="hidden"
        />
        <input
          ref={retakeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleRetakeFile}
          className="hidden"
        />

        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-2xl bg-slate-900 text-white rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[92dvh] md:max-h-[85vh] safe-area-top safe-area-bottom"
        >
          {/* Верхний бар iOS сканера */}
          <div className="sticky top-0 z-10 bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight">
                Медицинский сканер iPhone
              </span>
            </div>

            {!isProcessing && (
              <button
                onClick={handleCloseAll}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Закрыть сканер"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Состояние: Готово (успешное создание материала) */}
          {createdMaterial ? (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white leading-snug">
                  Материал успешно оцифрован! 🎉
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {createdMaterial.title}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 w-full max-w-xs text-left text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Распознано страниц:</span>
                  <span className="font-bold text-teal-400">{createdMaterial.pageCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Выделено тем:</span>
                  <span className="font-bold text-indigo-400">{createdMaterial.topicsCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Готовых вопросов:</span>
                  <span className="font-bold text-emerald-400">{createdMaterial.questionsCount}</span>
                </div>
              </div>

              <div className="w-full max-w-xs space-y-2 pt-2">
                <button
                  onClick={() => setIsOcrEditorOpen(true)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold border border-teal-500/30 flex items-center justify-center space-x-1.5 transition-colors ios-press"
                >
                  <FileText className="w-4 h-4" />
                  <span>Проверить и отредактировать текст</span>
                </button>

                <button
                  onClick={handleCloseAll}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-900/40 flex items-center justify-center space-x-1.5 transition-all ios-press"
                >
                  <span>Перейти к материалу</span>
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* Экран реальной обработки */
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  Оцифровка медицинского конспекта
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Обрабатываем {pages.length} {pages.length === 1 ? "страницу" : "страницы"} через AI OCR...
                </p>
              </div>

              {/* Список реальных стадий */}
              <div className="w-full max-w-sm bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-left space-y-2.5">
                {REAL_PROCESSING_STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={idx} className="flex items-center space-x-2.5 text-xs">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full bg-teal-400/20 text-teal-400 flex items-center justify-center shrink-0">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-700 text-slate-500 flex items-center justify-center shrink-0">
                          <span className="w-1 h-1 rounded-full bg-slate-500" />
                        </div>
                      )}
                      <span
                        className={`${
                          isDone
                            ? "text-slate-300"
                            : isCurrent
                            ? "text-teal-400 font-bold"
                            : "text-slate-500"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : pages.length === 0 ? (
            /* Экран пустого состояния: первый снимок */
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div
                onClick={handleTriggerCamera}
                className="w-24 h-24 rounded-3xl bg-teal-500/10 border-2 border-dashed border-teal-500/40 text-teal-400 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-500/20 transition-all ios-press"
              >
                <Camera className="w-10 h-10 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Снять
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">
                  Сфотографируйте страницу учебника или конспекта
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Нажмите на камеру, чтобы открыть заднюю камеру iPhone. Вы сможете сделать несколько снимков подряд.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 max-w-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleTriggerCamera}
                className="py-3 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-900/50 flex items-center space-x-2 ios-press"
              >
                <Camera className="w-4 h-4" />
                <span>Открыть камеру</span>
              </button>
            </div>
          ) : (
            /* Рабочая область сканера: предпросмотр и управление страницами */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Главная область предпросмотра активной страницы */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-[200px]">
                {activePage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activePage.previewUrl}
                    alt={`Страница ${activePage.pageNumber}`}
                    className="max-h-full max-w-full object-contain select-none"
                  />
                )}

                {/* Индикатор текущей страницы сверху */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-teal-300 flex items-center space-x-1.5">
                  <span>Страница {activePage?.pageNumber} из {pages.length}</span>
                </div>

                {/* Действия с активной страницей */}
                <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                  <button
                    onClick={() => handleTriggerRetake(activePreviewIndex)}
                    className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center space-x-1 ios-press"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Переснять</span>
                  </button>

                  <button
                    onClick={() => handleDeletePage(activePreviewIndex)}
                    className="p-1.5 rounded-full bg-rose-500/80 hover:bg-rose-600 text-white transition-colors ios-press"
                    aria-label="Удалить страницу"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Кнопки порядка страниц (вверх / вниз) */}
                <div className="absolute bottom-3 right-3 flex items-center space-x-1">
                  <button
                    disabled={activePreviewIndex === 0}
                    onClick={() => handleMovePage(activePreviewIndex, "up")}
                    className="p-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 disabled:opacity-30 text-white ios-press"
                    title="Сдвинуть назад"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={activePreviewIndex === pages.length - 1}
                    onClick={() => handleMovePage(activePreviewIndex, "down")}
                    className="p-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 disabled:opacity-30 text-white ios-press"
                    title="Сдвинуть вперёд"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Лента миниатюр страниц (горизонтальная прокрутка) */}
              <div className="px-4 py-3 bg-slate-900/90 border-t border-slate-800 shrink-0">
                <div className="flex items-center space-x-2.5 overflow-x-auto no-scrollbar py-0.5">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`relative w-14 h-18 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ios-press ${
                        idx === activePreviewIndex
                          ? "border-teal-400 shadow-md shadow-teal-500/20 scale-105"
                          : "border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt={`Превью ${p.pageNumber}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 left-0.5 right-0.5 text-center bg-black/70 text-[9px] font-bold text-white rounded-xs">
                        {p.pageNumber}
                      </span>
                    </div>
                  ))}

                  {/* Кнопка добавления новой страницы */}
                  <button
                    onClick={handleTriggerCamera}
                    className="w-14 h-18 rounded-xl border-2 border-dashed border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 flex flex-col items-center justify-center shrink-0 transition-colors ios-press"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-1">+ Фото</span>
                  </button>
                </div>
              </div>

              {/* Настройки заголовка и кнопка «Готово» */}
              <div className="p-4 bg-slate-900 border-t border-slate-800/80 space-y-2.5 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Название (или определится автоматически)"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                  />

                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Общая медицина">Общая медицина</option>
                    <option value="Анатомия">Анатомия человека</option>
                    <option value="Фармакология">Фармакология</option>
                    <option value="Физиология">Нормальная физиология</option>
                    <option value="Патофизиология">Патофизиология</option>
                  </select>
                </div>

                {errorMsg && (
                  <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
                )}

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={handleTriggerCamera}
                    className="py-2.5 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors ios-press shrink-0"
                  >
                    <Plus className="w-4 h-4 text-teal-400" />
                    <span>Добавить страницу</span>
                  </button>

                  <button
                    onClick={handleStartProcessing}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-900/40 flex items-center justify-center space-x-1.5 transition-all ios-press"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Готово ({pages.length} {pages.length === 1 ? "страница" : "страниц"})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Редактор OCR текста */}
        {createdMaterial && (
          <OcrEditorModal
            isOpen={isOcrEditorOpen}
            onClose={() => setIsOcrEditorOpen(false)}
            materialId={createdMaterial.id}
            materialTitle={createdMaterial.title}
            initialPages={createdMaterial.pages || []}
          />
        )}
      </div>
    </AnimatePresence>
  );
}
