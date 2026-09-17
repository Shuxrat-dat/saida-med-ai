import { SafeContainer } from "@/components/layout/SafeContainer";
import {
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  Award,
} from "lucide-react";

export default function ProfilePage() {
  return (
    <SafeContainer>
      <div className="pt-2 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Профиль студентки
        </h2>
        <p className="text-xs text-slate-500">
          Персональные настройки для Саиды
        </p>
      </div>

      <div className="space-y-4">
        {/* Карточка профиля */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 text-white font-extrabold text-xl flex items-center justify-center shadow-sm">
            С
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-base font-bold text-slate-900">Саида</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-slate-500">Студентка медицинского • 3 курс</p>
            <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
              saida@med.ai
            </p>
          </div>
        </div>

        {/* Инструкция PWA для Safari на iPhone */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card">
          <div className="flex items-center space-x-2 text-slate-900 mb-2">
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold">Установка на iPhone (PWA)</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Установите Saida Med AI на экран «Домой» для быстрого запуска и полноэкранного режима без рамок браузера:
          </p>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              <span>Нажмите кнопку <strong>«Поделиться»</strong> в Safari</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              <span>Прокрутите список и нажмите <strong>«На экран «Домой»»</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              <span>Нажмите <strong>«Добавить»</strong> в правом верхнем углу</span>
            </div>
          </div>
        </div>

        {/* Учебные цели */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-ios-card space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Учебные цели</h3>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/50 text-xs">
            <span className="text-slate-700">Дневная цель вопросов</span>
            <span className="font-bold text-teal-800">50 вопросов</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/50 text-xs">
            <span className="text-slate-700">Алгоритм интервальных повторений</span>
            <span className="font-bold text-teal-800">SuperMemo SM-2</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/50 text-xs">
            <span className="text-slate-700">Защита от галлюцинаций (RAG)</span>
            <span className="font-bold text-emerald-700 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Активна</span>
            </span>
          </div>
        </div>

        {/* Предупреждение о медицинском назначении */}
        <div className="p-4 rounded-3xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Учебное предупреждение</strong>
            <span>
              Saida Med AI — это образовательная платформа для подготовки к экзаменам и закрепления пройденного материала. Она не является клинической системой постановки диагнозов и не заменяет врачебные решения.
            </span>
          </div>
        </div>
      </div>
    </SafeContainer>
  );
}
