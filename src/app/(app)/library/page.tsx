"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeContainer } from "@/components/layout/SafeContainer";
import { UploadModal } from "@/components/library/UploadModal";
import { CameraScannerModal } from "@/components/library/CameraScannerModal";
import { OcrEditorModal } from "@/components/library/OcrEditorModal";
import { MockMaterial } from "@/lib/db/mock-data";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Camera,
  UploadCloud,
  Edit3,
} from "lucide-react";

export default function LibraryPage() {
  const [materials, setMaterials] = useState<MockMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MockMaterial | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/materials")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.materials) setMaterials(data.materials);
      })
      .catch((err) => console.error("Error loading materials:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleUploadSuccess = (newMat: MockMaterial) => {
    setMaterials((prev) => [newMat, ...prev]);
  };

  const filtered = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject =
      selectedSubject === "ALL" || m.subject.toLowerCase().includes(selectedSubject.toLowerCase());
    return matchesSearch && matchesSubject;
  });

  return (
    <SafeContainer>
      {/* Шапка с заголовком */}
      <div className="pt-2 pb-3">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Учебные материалы
        </h2>
        <p className="text-xs text-slate-500">
          {materials.length} загруженных лекций, методичек и сканов
        </p>
      </div>

      {/* Быстрые действия: Камера iPhone + Загрузка файла */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Главная кнопка: Камера для iPhone */}
        <button
          onClick={() => setIsCameraOpen(true)}
          className="p-3.5 rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-white text-left shadow-ios-card relative overflow-hidden transition-all hover:shadow-md ios-press flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              iPhone
            </span>
          </div>

          <div>
            <h3 className="text-xs font-bold leading-tight">Камера</h3>
            <p className="text-[10px] text-teal-100 mt-0.5 leading-snug">
              Сфотографировать материал
            </p>
          </div>
        </button>

        {/* Вторая кнопка: Загрузить файл */}
        <button
          onClick={() => setIsUploadOpen(true)}
          className="p-3.5 rounded-3xl bg-white border border-slate-200/80 text-left shadow-ios-card transition-all hover:border-slate-300 ios-press flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <UploadCloud className="w-4 h-4 text-teal-700" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">PDF • DOCX</span>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-800 leading-tight">Загрузить файл</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              Выбрать документ
            </p>
          </div>
        </button>
      </div>

      {/* Поиск и фильтр дисциплин */}
      <div className="space-y-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по лекциям, темам и конспектам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
          />
        </div>

        {/* Чипы фильтра дисциплин */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          {[
            { id: "ALL", label: "Все предметы" },
            { id: "Анатомия", label: "Анатомия" },
            { id: "Фармакология", label: "Фармакология" },
            { id: "Физиология", label: "Физиология" },
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors shrink-0 ios-press ${
                selectedSubject === sub.id
                  ? "bg-teal-700 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Список учебных материалов */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-4 rounded-3xl bg-white border border-slate-100 shadow-ios-card animate-pulse"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
                  </div>
                </div>
                <div className="mt-3 h-9 bg-slate-50 rounded-2xl" />
              </div>
            ))}
          </>
        ) : (
          <>
            {filtered.map((mat) => (
          <div
            key={mat.id}
            className="p-4 rounded-3xl bg-white border border-slate-100 shadow-ios-card block hover:border-teal-200 transition-all"
          >
            <Link href={`/library/${mat.id}`} className="block ios-press">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                    {mat.fileType === "camera_scan" ? (
                      <Camera className="w-5 h-5 text-teal-600" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {mat.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-teal-800">{mat.subject}</span>
                      <span>•</span>
                      <span>{mat.pageCount} стр.</span>
                      <span>•</span>
                      <span className="uppercase text-[10px]">
                        {mat.fileType === "camera_scan" ? "Скан" : mat.fileType}
                      </span>
                    </div>
                  </div>
                </div>

                {mat.status === "READY" ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Готов</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                    <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Анализ...</span>
                  </span>
                )}
              </div>

              {/* Аннотация от AI */}
              {mat.summary && (
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-2.5 leading-relaxed bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100">
                  {mat.summary}
                </p>
              )}
            </Link>

            {/* Метрики в футере карточки и кнопки действий */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>{mat.topicsCount} тем</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{mat.questionsCount} вопросов</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {mat.pages && mat.pages.length > 0 && (
                  <button
                    onClick={() => setEditingMaterial(mat)}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-xl hover:bg-teal-100 ios-press"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Текст OCR</span>
                  </button>
                )}

                <Link
                  href={`/library/${mat.id}`}
                  className="flex items-center text-teal-700 font-semibold text-xs ios-press"
                >
                  <span>Открыть</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-6">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Материалы не найдены</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Сфотографируйте конспект на камеру или загрузите файл
            </p>
          </div>
        )}
          </>
        )}
      </div>

      {/* Модальное окно загрузки файлов */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Модальное окно камеры iPhone */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={handleUploadSuccess}
      />

      {/* Модальное окно просмотра и редактирования OCR текста */}
      {editingMaterial && (
        <OcrEditorModal
          isOpen={Boolean(editingMaterial)}
          onClose={() => setEditingMaterial(null)}
          materialId={editingMaterial.id}
          materialTitle={editingMaterial.title}
          initialPages={editingMaterial.pages || []}
          onSaveSuccess={(updated) => {
            setMaterials((prev) =>
              prev.map((m) =>
                m.id === editingMaterial.id
                  ? { ...m, pages: updated }
                  : m
              )
            );
          }}
        />
      )}
    </SafeContainer>
  );
}
