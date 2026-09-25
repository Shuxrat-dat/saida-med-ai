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

  const breadcrumbMap: Record<string, string> = {
    "/": "Главная",
    "/library": "Материалы",
    "/quiz": "Тесты",
    "/flashcards": "Карточки",
    "/progress": "Прогресс",
    "/profile": "Профиль",
    "/dashboard": "Дашборд",
  };

  const pageLabel = breadcrumbMap[pathname] ?? "";

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/60 safe-area-top safe-area-left safe-area-right pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="w-full max-w-full md:max-w-none mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack ? (
            <button
              onClick={handleBack}
              aria-label="Вернуться назад"
              className="shrink-0 p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100/80 transition-colors ios-press flex items-center min-h-[40px]"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              <span className="text-sm font-medium text-teal-700 ml-0.5 hidden sm:inline">
                Назад
              </span>
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <span className="text-[11px] font-semibold tracking-wider text-teal-800 uppercase block">
                  SAIDA MED
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">AI-ассистент</span>
              </div>
            </div>
          )}

          {/* Mobile-only brand logo */}
          {!showBack && (
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-semibold tracking-wider text-teal-800 uppercase block">
                  SAIDA MED AI
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">
                  Личный учебный ассистент
                </span>
              </div>
            </div>
          )}

          {/* Desktop: breadcrumb label + search */}
          {!isHome && (
            <div
              className={`text-center truncate hidden md:block ${
                showBack ? "ml-4" : "ml-4"
              }`}
            >
              <h1 className="text-sm font-semibold text-slate-900 truncate">
                {title || pageLabel}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
              )}
            </div>
          )}
          {!isHome && title && (
            <div className="md:hidden text-center truncate px-2 max-w-[140px] flex-1">
              <h1 className="text-sm font-semibold text-slate-900 truncate">{title}</h1>
              {subtitle && (
                <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>
              )}
            </div>
          )}

          {/* Desktop search bar */}
          <div className="hidden lg:flex flex-1 max-w-md ml-6">
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Поиск по материалам, темам, вопросам..."
                className="w-full h-10 pl-9 pr-3 rounded-full bg-slate-100/70 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-300"
                aria-label="Поиск"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Серия дней обучения — compact на desktop */}
          <Link
            href="/progress"
            aria-label="Серия дней обучения"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-semibold ios-press min-h-[36px]"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>12 дн.</span>
          </Link>

          {/* Индикатор профиля Саиды */}
          <Link
            href="/profile"
            aria-label="Профиль Саиды"
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-900 font-semibold text-sm relative ios-press shrink-0"
          >
            <span>С</span>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </Link>
        </div>
      </div>
    </header>
  );
}
