import { notFound } from "next/navigation";
import Link from "next/link";
import { SafeContainer } from "@/components/layout/SafeContainer";
import { KnowledgeTreeMap } from "@/components/library/KnowledgeTreeMap";
import { MedicalRepository } from "@/lib/db/repository";
import {
  FileText,
  Sparkles,
  HelpCircle,
  Layers,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const material = await MedicalRepository.getMaterialById(id);

  if (!material) {
    notFound();
  }

  const topics = await MedicalRepository.getTopicsByMaterial(id);

  return (
    <SafeContainer>
      {/* Навигация назад */}
      <div className="pt-2 pb-3 flex items-center justify-between">
        <Link
          href="/library"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-800 hover:text-teal-900 ios-press"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Все материалы</span>
        </Link>

        <span className="text-[11px] font-semibold text-slate-400">
          ID: {material.id}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-12 lg:gap-6">
        {/* Главная карточка материала — summary stats 1/3 на sm→lg, 3/12 на lg+ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card sm:col-span-1 sm:order-2 lg:col-span-3 lg:order-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Готов</span>
            </span>
          </div>

          <h2 className="text-base font-bold text-slate-900 mt-3 leading-snug truncate">
            {material.title}
          </h2>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-1 min-w-0">
            <span className="font-semibold text-teal-800 truncate">{material.subject}</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">{material.pageCount} стр.</span>
            <span className="shrink-0">•</span>
            <span className="uppercase shrink-0">{material.fileType}</span>
          </div>

          {/* Статистика материала */}
          <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            <div className="p-2.5 rounded-2xl bg-teal-50/50 text-center min-w-0">
              <p className="text-lg font-extrabold text-teal-800 leading-none truncate">
                {topics.length}
              </p>
              <p className="text-[10px] font-semibold text-teal-700 mt-1 truncate">
                Тем
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-indigo-50/50 text-center min-w-0">
              <p className="text-lg font-extrabold text-indigo-800 leading-none truncate">
                {topics.reduce((acc, t) => acc + t.concepts.length, 0)}
              </p>
              <p className="text-[10px] font-semibold text-indigo-700 mt-1 truncate">
                Понятий
              </p>
            </div>
          </div>

          {/* AI Аннотация и выводы */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 hidden sm:block min-w-0">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">Синтез AI</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 line-clamp-6">
              {material.summary}
            </p>
          </div>

          {/* Кнопки быстрых учебных действий */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 pt-2 min-w-0">
            <Link
              href={`/quiz?materialId=${material.id}`}
              className="py-2.5 px-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all ios-press min-w-0"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Начать тест</span>
            </Link>

            <Link
              href={`/flashcards?materialId=${material.id}`}
              className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors ios-press min-w-0"
            >
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Карточки</span>
            </Link>
          </div>
        </div>

        {/* AI Аннотация mobile-only (видна только < sm) */}
        <div className="sm:hidden bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card min-w-0">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Синтез учебного материала от AI</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            {material.summary}
          </p>
        </div>

        {/* Интерактивная карта знаний — topics 2/3 на sm→lg, 9/12 на lg+ (детализация тем) */}
        <div className="sm:col-span-2 sm:order-1 lg:col-span-9 lg:order-2 min-w-0">
          <KnowledgeTreeMap
            topics={topics}
            materialTitle={material.title}
            materialId={material.id}
          />
        </div>
      </div>
    </SafeContainer>
  );
}
