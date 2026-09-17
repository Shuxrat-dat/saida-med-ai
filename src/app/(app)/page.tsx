import { SafeContainer } from "@/components/layout/SafeContainer";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { ContinueStudyCard } from "@/components/dashboard/ContinueStudyCard";
import { WeakTopicPills } from "@/components/dashboard/WeakTopicPills";
import { RecentMaterials } from "@/components/dashboard/RecentMaterials";
import { MedicalRepository } from "@/lib/db/repository";
import { Calendar, BookOpen, Layers, HelpCircle } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const materials = await MedicalRepository.getMaterials();
  const stats = await MedicalRepository.getStudyStats();
  const weakTopics = stats.weakTopics;

  return (
    <SafeContainer>
      {/* Приветствие для Саиды */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-teal-800">
              <Calendar className="w-3.5 h-3.5" />
              <span>Среда, 16 сентября</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Доброе утро, Саида 👋
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Готова продолжить разбор медицинских материалов и слабых тем?
            </p>
          </div>
        </div>
      </div>

      {/* Основные виджеты дашборда */}
      <div className="space-y-4">
        {/* Кольцо дневной цели */}
        <ProgressRing
          percentage={stats.dailyProgressPct}
          completedQuestions={stats.completedToday}
          totalGoal={stats.dailyGoal}
        />

        {/* Быстрые действия */}
        <div className="grid grid-cols-3 gap-2.5">
          <Link
            href="/quiz"
            className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center ios-press"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Тесты</span>
            <span className="text-[10px] text-slate-400">Проверка знаний</span>
          </Link>

          <Link
            href="/flashcards"
            className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center ios-press"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Карточки</span>
            <span className="text-[10px] text-slate-400">Интервалы</span>
          </Link>

          <Link
            href="/library"
            className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center ios-press"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-1">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Материалы</span>
            <span className="text-[10px] text-slate-400">Лекции</span>
          </Link>
        </div>

        {/* Карточка продолжения обучения */}
        <ContinueStudyCard />

        {/* Темы для повторения */}
        <WeakTopicPills weakTopics={weakTopics} />

        {/* Недавние материалы */}
        <RecentMaterials materials={materials} />
      </div>
    </SafeContainer>
  );
}
