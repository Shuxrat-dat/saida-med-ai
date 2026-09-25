import { SafeContainer } from "@/components/layout/SafeContainer";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { ContinueStudyCard } from "@/components/dashboard/ContinueStudyCard";
import { WeakTopicPills } from "@/components/dashboard/WeakTopicPills";
import { DueTodayTopics } from "@/components/dashboard/DueTodayTopics";
import { RecentMaterials } from "@/components/dashboard/RecentMaterials";
import { MedicalRepository } from "@/lib/db/repository";
import {
  Calendar,
  BookOpen,
  Layers,
  HelpCircle,
  Flame,
  Target,
  GraduationCap,
  Percent,
} from "lucide-react";
import Link from "next/link";

function getGreeting(): { greeting: string; dateStr: string; subtitle: string } {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Добрый день";
  if (hour < 6 || hour >= 22) greeting = "Доброй ночи";
  else if (hour < 12) greeting = "Доброе утро";
  else if (hour < 18) greeting = "Добрый день";
  else greeting = "Добрый вечер";

  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const weekdays = [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ];
  const dateStr = `${weekdays[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  const subtitle =
    greeting === "Доброй ночи"
      ? "Небольшой повтор перед сном отлично закрепит знания."
      : "Готова продолжить разбор медицинских материалов и слабых тем?";
  return { greeting, dateStr, subtitle };
}

export default async function HomePage() {
  const [materials, stats] = await Promise.all([
    MedicalRepository.getMaterials(),
    MedicalRepository.getStudyStats(),
  ]);
  const weakTopics = stats.weakTopics;
  const dueTopics = stats.topicsDueToday;
  const { greeting, dateStr, subtitle } = getGreeting();

  return (
    <SafeContainer>
      {/* Приветствие для Саиды */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-teal-800">
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {greeting}, Саида 👋
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Основные виджеты дашборда */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-3 xl:gap-5">
        {/* Кольцо дневной цели */}
        <div className="min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <ProgressRing
            percentage={stats.dailyProgressPct}
            completedQuestions={stats.completedToday}
            totalGoal={stats.dailyGoal}
          />
        </div>

        {/* Сводка прогресса */}
        <div className="min-w-0 grid grid-cols-3 gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center mb-1 mx-auto">
              <GraduationCap className="w-4 h-4" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 leading-none truncate">
              {stats.totalTopicsStudied}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
              Тем изучено
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1 mx-auto">
              <Target className="w-4 h-4" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 leading-none truncate">
              {stats.totalQuestionsAnswered}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
              Вопросов решено
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1 mx-auto">
              <Percent className="w-4 h-4" />
            </div>
            <p className="text-lg font-extrabold text-slate-900 leading-none truncate">
              {stats.overallAccuracy}%
            </p>
            <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
              Точность ответов
            </p>
          </div>
        </div>

        {/* Стрик */}
        {stats.streakDays > 0 && (
          <div className="min-w-0 p-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 flex items-center space-x-3 sm:col-span-1 lg:col-span-1 xl:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-orange-200/60 flex items-center justify-center shadow-2xs shrink-0">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-orange-900 truncate">
                {stats.streakDays} дней подряд 🔥
              </p>
              <p className="text-[11px] text-orange-800/80 line-clamp-2">
                Ты в удачном ритме! Удерживать темп — половина успеха.
              </p>
            </div>
          </div>
        )}

        {/* Быстрые действия */}
        <div className="min-w-0 grid grid-cols-3 gap-2.5 sm:col-span-2 lg:col-span-2 xl:col-span-1">
          <Link
            href="/quiz"
            className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center ios-press min-w-0 max-w-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1 shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 truncate w-full">Тесты</span>
            <span className="text-[10px] text-slate-400 truncate w-full">Проверка знаний</span>
          </Link>

          <Link
            href="/flashcards"
            className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center ios-press min-w-0 max-w-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-1 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 truncate w-full">Карточки</span>
            <span className="text-[10px] text-slate-400 truncate w-full">Интервалы</span>
          </Link>

          <Link
            href="/library"
            className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center ios-press min-w-0 max-w-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-1 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 truncate w-full">Материалы</span>
            <span className="text-[10px] text-slate-400 truncate w-full">Лекции</span>
          </Link>
        </div>

        {/* Карточка продолжения обучения */}
        <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <ContinueStudyCard />
        </div>

        {/* Темы на сегодня — интервальные повторения */}
        <div className="min-w-0 sm:col-span-1 lg:col-span-1 xl:col-span-1">
          <DueTodayTopics dueTopics={dueTopics} />
        </div>

        {/* Слабые темы */}
        {weakTopics.length > 0 && (
          <div className="min-w-0 sm:col-span-1 lg:col-span-1 xl:col-span-1">
            <WeakTopicPills weakTopics={weakTopics} />
          </div>
        )}

        {/* Недавние материалы */}
        <div className="min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <RecentMaterials materials={materials} />
        </div>
      </div>
    </SafeContainer>
  );
}
