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

      {/* Главная карточка материала */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card mb-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Готов к изучению</span>
          </span>
        </div>

        <h2 className="text-base font-bold text-slate-900 mt-3 leading-snug">
          {material.title}
        </h2>

        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
          <span className="font-semibold text-teal-800">{material.subject}</span>
          <span>•</span>
          <span>{material.pageCount} стр.</span>
          <span>•</span>
          <span className="uppercase">{material.fileType}</span>
        </div>

        {/* AI Аннотация и выводы */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Синтез учебного материала от AI</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            {material.summary}
          </p>
        </div>

        {/* Кнопки быстрых учебных действий */}
        <div className="mt-4 grid grid-cols-2 gap-2 pt-2">
          <Link
            href={`/quiz?materialId=${material.id}`}
            className="py-2.5 px-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all ios-press"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Начать тест по материалу</span>
          </Link>

          <Link
            href={`/flashcards?materialId=${material.id}`}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors ios-press"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Повторить карточки</span>
          </Link>
        </div>
      </div>

      {/* Интерактивная карта знаний */}
      <KnowledgeTreeMap
        topics={topics}
        materialTitle={material.title}
        materialId={material.id}
      />
    </SafeContainer>
  );
}
