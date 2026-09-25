"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Target,
  Flame,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BarChart2,
  Clock,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DueTopic {
  id: string;
  name: string;
  masteryLevel: number;
  nextReviewAt: string;
}

interface Stats {
  completedToday: number;
  dailyGoal: number;
  streakDays: number;
  overallAccuracy: number;
  weakTopics: { id: string; name: string; masteryLevel: number }[];
  dueTopics: DueTopic[];
}

export function ProgressRightPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/materials")
      .then(() => {})
      .catch(() => {});
    fetch("/api/quizzes/generate", { method: "HEAD" })
      .catch(() => {});
    setStats({
      completedToday: 12,
      dailyGoal: 30,
      streakDays: 12,
      overallAccuracy: 78,
      weakTopics: [
        { id: "w1", name: "АВ-блокада 2 степени", masteryLevel: 1 },
        { id: "w2", name: "Диастолическая дисфункция ЛЖ", masteryLevel: 1 },
        { id: "w3", name: "Гломерулярная фильтрация", masteryLevel: 2 },
      ],
      dueTopics: [
        { id: "d1", name: "Сердечная недостаточность", masteryLevel: 3, nextReviewAt: "сегодня" },
        { id: "d2", name: "Артериальная гипертензия", masteryLevel: 2, nextReviewAt: "сегодня" },
        { id: "d3", name: "Почки: канальцевая реабсорбция", masteryLevel: 2, nextReviewAt: "завтра" },
      ],
    });
    setLoading(false);
  }, []);

  const progressPct = stats ? Math.min(100, (stats.completedToday / stats.dailyGoal) * 100) : 0;

  const masteryColor = (m: number) =>
    m >= 4
      ? "bg-emerald-500"
      : m >= 3
        ? "bg-sky-500"
        : m >= 2
          ? "bg-amber-500"
          : m >= 1
            ? "bg-orange-500"
            : "bg-slate-300";

  return (
    <aside
      className={cn(
        "hidden lg:flex xl:sticky xl:top-16 xl:self-start xl:max-h-[calc(100dvh-4rem)] flex-col shrink-0 border-l border-slate-200/70 bg-white transition-all duration-200 overflow-hidden",
        collapsed ? "lg:flex xl:w-14" : "xl:w-80 lg:w-64"
      )}
      aria-label="Правая панель прогресса"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200/70 shrink-0">
        {!collapsed && (
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-teal-600" />
            Сегодня
          </h3>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 ml-auto shrink-0"
          aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
        >
          {collapsed ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5">
          {/* Daily progress ring */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Target className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Дневная цель
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {stats?.completedToday ?? 0}/{stats?.dailyGoal ?? 30}
              </span>
            </div>
            <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              Серия: <b className="text-amber-700">{stats?.streakDays ?? 0} дней</b>
            </p>
          </div>

          {/* Due topics today */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-rose-500" />
                Сегодня повторить
              </h4>
              <Link
                href="/quiz?mode=WEAK_TOPICS"
                className="text-[10px] font-bold text-teal-700 hover:text-teal-800"
              >
                Все →
              </Link>
            </div>
            <ul className="space-y-1.5">
              {loading
                ? [0, 1, 2].map((i) => (
                    <li key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                  ))
                : stats?.dueTopics.slice(0, 4).map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/quiz?topicId=${t.id}`}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors ios-press"
                      >
                        <span
                          className={cn(
                            "w-1.5 h-8 rounded-full shrink-0",
                            masteryColor(t.masteryLevel)
                          )}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {t.name}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            Mastery {t.masteryLevel}/5
                            <span>·</span>
                            <span className="text-rose-600 font-medium">{t.nextReviewAt}</span>
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
            </ul>
          </div>

          {/* Weak spots */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Слабые темы
              </h4>
              <Link
                href="/progress"
                className="text-[10px] font-bold text-teal-700 hover:text-teal-800"
              >
                Аналитика →
              </Link>
            </div>
            <ul className="space-y-1.5">
              {stats?.weakTopics.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-amber-50/50 border border-amber-100/50"
                >
                  <span
                    className={cn("w-1.5 h-8 rounded-full shrink-0", masteryColor(w.masteryLevel))}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{w.name}</p>
                    <div className="w-full h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", masteryColor(w.masteryLevel))}
                        style={{ width: `${(w.masteryLevel / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links compact */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <Link
              href="/library"
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 ios-press"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              Все материалы
            </Link>
            <Link
              href="/flashcards"
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 ios-press"
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Колоды карточек
            </Link>
          </div>
        </div>
      )}

      {/* Collapsed icons only mode */}
      {collapsed && (
        <div className="flex-1 flex flex-col items-center py-3 gap-3">
          <Link
            href="/progress"
            className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100 ios-press"
            aria-label="Прогресс"
            title="Прогресс"
          >
            <BarChart2 className="w-5 h-5" />
          </Link>
          <Link
            href="/quiz?mode=WEAK_TOPICS"
            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 ios-press"
            aria-label="Повторить слабые темы"
            title="Слабые места"
          >
            <AlertTriangle className="w-5 h-5" />
          </Link>
        </div>
      )}
    </aside>
  );
}
