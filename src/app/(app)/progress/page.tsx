import Link from "next/link";
import { SafeContainer } from "@/components/layout/SafeContainer";
import { MedicalRepository } from "@/lib/db/repository";
import {
  Flame,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default async function ProgressPage() {
  const stats = await MedicalRepository.getStudyStats();
  const weakTopics = stats.weakTopics;
  const strongTopics = stats.strongTopics;

  return (
    <SafeContainer>
      <div className="pt-2 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Учебная аналитика
        </h2>
        <p className="text-xs text-slate-500">
          Показатели удержания материала и сигналы освоения
        </p>
      </div>

      <div className="space-y-4">
        {/* Сетка ключевых метрик */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-ios-card">
            <div className="flex items-center space-x-2 text-amber-600 mb-1">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Серия</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.streakDays} дней</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Топ 5% по регулярности</p>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-ios-card">
            <div className="flex items-center space-x-2 text-teal-700 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Точность</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.overallAccuracy}%</div>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalQuestionsAnswered} вопросов отвечено</p>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-ios-card">
            <div className="flex items-center space-x-2 text-indigo-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Время учёбы</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.studyTimeHours} ч</div>
            <p className="text-[10px] text-slate-400 mt-0.5">За последние 7 дней</p>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-ios-card">
            <div className="flex items-center space-x-2 text-emerald-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Удержание</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.retentionRate}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Интервалы SM-2 в норме</p>
          </div>
        </div>

        {/* Темы для повторения */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Темы для повторения (&lt; 65%)</h3>
            </div>
            <Link
              href="/quiz?mode=WEAK_TOPICS"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-0.5"
            >
              <span>Повторить всё</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {weakTopics.map((topic) => {
              const pct = Math.round(topic.accuracyRate * 100);
              return (
                <div
                  key={topic.id}
                  className="p-3 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {topic.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-20 bg-rose-200/60 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-rose-600">{pct}%</span>
                    </div>
                  </div>

                  <Link
                    href={`/quiz?topicId=${topic.id}`}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-rose-200 text-rose-700 rounded-xl shadow-2xs ios-press"
                  >
                    Тренировать
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Хорошо освоенные темы */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Хорошо освоенные темы (&ge; 75%)</h3>
          </div>

          <div className="space-y-2.5">
            {strongTopics.map((topic) => {
              const pct = Math.round(topic.accuracyRate * 100);
              return (
                <div
                  key={topic.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {topic.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">{pct}%</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    Освоено
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SafeContainer>
  );
}
