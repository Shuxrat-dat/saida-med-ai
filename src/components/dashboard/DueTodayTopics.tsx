"use client";

import Link from "next/link";
import { RotateCcw, ChevronRight, AlertTriangle, Sparkles } from "lucide-react";
import { MockTopic } from "@/lib/db/mock-data";

interface DueTodayTopicsProps {
  dueTopics: MockTopic[];
}

export function DueTodayTopics({ dueTopics }: DueTodayTopicsProps) {
  const now = Date.now();
  const overdue = dueTopics.filter((t) => {
    if (!t.nextReviewAt) return false;
    return new Date(t.nextReviewAt).getTime() < now;
  });
  const dueTodayCount = dueTopics.length;

  if (dueTodayCount === 0) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Интервальные повторения</h3>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
          <p className="text-sm font-bold text-emerald-800">На сегодня повторений нет ✅</p>
          <p className="text-[11px] text-emerald-700 mt-1">
            Отличная работа, все темы повторены по расписанию!
          </p>
          <Link
            href="/library"
            className="mt-3 inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-white text-emerald-800 text-[11px] font-bold border border-emerald-200/60 shadow-2xs ios-press"
          >
            <span>Открыть материалы</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Сегодня стоит повторить</h3>
          <div className="flex items-center space-x-1 ml-1">
            {overdue.length > 0 && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>🔴 {overdue.length} просрочено</span>
              </span>
            )}
            {dueTodayCount - overdue.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                🟡 {dueTodayCount - overdue.length} сегодня
              </span>
            )}
          </div>
        </div>
        <Link
          href="/quiz?mode=DUE_TODAY"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center space-x-0.5 ios-press"
        >
          <span>Начать повтор</span>
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      <p className="text-xs text-slate-500 mb-3.5">
        Темы по расписанию SM-2-интервалов для долгосрочного запоминания:
      </p>

      <div className="space-y-2.5">
        {dueTopics.slice(0, 5).map((topic) => {
          const isOverdue =
            topic.nextReviewAt && new Date(topic.nextReviewAt).getTime() < now;
          const mastery = topic.masteryLevel ?? 0;
          return (
            <div
              key={topic.id}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-colors hover:bg-slate-100/70 ${
                isOverdue
                  ? "bg-rose-50/50 border-rose-200/60"
                  : "bg-slate-50 border-slate-200/60"
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {topic.name}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < mastery ? "bg-teal-500" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    L{mastery} · {topic.totalAttempts} попыток
                  </span>
                  {isOverdue && (
                    <span className="text-[10px] font-semibold text-rose-600">
                      ⚠️ просрочено
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/quiz?topicId=${topic.id}&mode=REVIEW_WEAK`}
                className="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:text-teal-700 rounded-xl shadow-2xs ios-press flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3 text-teal-600" />
                <span>Повторить</span>
              </Link>
            </div>
          );
        })}
        {dueTopics.length > 5 && (
          <Link
            href="/quiz?mode=DUE_TODAY"
            className="block text-center py-2 px-3 text-[11px] font-semibold text-slate-500 hover:text-teal-700 ios-press"
          >
            Показать ещё {dueTopics.length - 5} тем →
          </Link>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          href="/quiz?mode=DUE_TODAY"
          className="w-full py-2.5 px-3 rounded-2xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200/60 text-teal-800 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors ios-press"
        >
          <RotateCcw className="w-4 h-4 text-teal-600" />
          <span>Начать интервальное повторение ({dueTodayCount})</span>
        </Link>
      </div>
    </div>
  );
}
