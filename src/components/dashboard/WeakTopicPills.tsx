"use client";

import Link from "next/link";
import { AlertCircle, Target, ArrowRight } from "lucide-react";
import { MockTopic } from "@/lib/db/mock-data";

interface WeakTopicPillsProps {
  weakTopics: MockTopic[];
}

export function WeakTopicPills({ weakTopics }: WeakTopicPillsProps) {
  if (!weakTopics || weakTopics.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Темы для повторения</h3>
        </div>
        <Link
          href="/quiz?mode=WEAK_TOPICS"
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center space-x-0.5 ios-press"
        >
          <span>Целевой тест</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      <p className="text-xs text-slate-500 mb-3.5">
        Темы, где твоя точность ответов опустилась ниже 65%:
      </p>

      <div className="space-y-2.5">
        {weakTopics.map((topic) => {
          const accuracyPct = Math.round(topic.accuracyRate * 100);
          return (
            <div
              key={topic.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between transition-colors hover:bg-slate-100/70"
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {topic.name}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        accuracyPct < 55 ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${accuracyPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      accuracyPct < 55 ? "text-rose-600" : "text-amber-600"
                    }`}
                  >
                    {accuracyPct}%
                  </span>
                </div>
              </div>

              <Link
                href={`/quiz?topicId=${topic.id}`}
                className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:text-teal-700 rounded-xl shadow-2xs ios-press flex items-center space-x-1"
              >
                <Target className="w-3 h-3 text-teal-600" />
                <span>Повторить</span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Кнопка адаптивного теста по слабым местам */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          href="/quiz?mode=WEAK_TOPICS"
          className="w-full py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 text-rose-800 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors ios-press"
        >
          <Target className="w-4 h-4 text-rose-600" />
          <span>Протестируй меня по слабым темам</span>
        </Link>
      </div>
    </div>
  );
}
