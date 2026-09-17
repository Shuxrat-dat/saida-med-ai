"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, Flame, Sparkles } from "lucide-react";

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
}

export function TopHeader({ title, subtitle, showBack = false, backHref }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/60 safe-area-top">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {showBack ? (
            <button
              onClick={handleBack}
              aria-label="Вернуться назад"
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100/80 transition-colors ios-press flex items-center"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              <span className="text-sm font-medium text-teal-700 ml-0.5">Назад</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider text-teal-800 uppercase block leading-tight">
                  SAIDA MED AI
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">
                  Личный учебный ассистент
                </span>
              </div>
            </div>
          )}
        </div>

        {title && !isHome && (
          <div className="text-center truncate px-2 max-w-[160px]">
            <h1 className="text-sm font-semibold text-slate-900 truncate">{title}</h1>
            {subtitle && <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>}
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* Серия дней обучения */}
          <Link
            href="/progress"
            aria-label="Серия дней обучения"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-semibold ios-press"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>12 дн.</span>
          </Link>

          {/* Индикатор профиля Саиды */}
          <Link
            href="/profile"
            aria-label="Профиль Саиды"
            className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-900 font-semibold text-xs relative ios-press"
          >
            <span>С</span>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </Link>
        </div>
      </div>
    </header>
  );
}
