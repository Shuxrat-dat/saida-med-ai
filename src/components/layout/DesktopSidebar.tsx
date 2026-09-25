"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  HelpCircle,
  Layers,
  BarChart2,
  User,
  Flame,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/library", label: "Материалы", icon: FolderKanban },
  { href: "/library", label: "Темы", icon: BookOpen, secondary: true },
  { href: "/quiz", label: "Тесты", icon: HelpCircle },
  { href: "/flashcards", label: "Карточки", icon: Layers },
  { href: "/progress", label: "Прогресс", icon: BarChart2 },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  const isCompactLandscape = typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
  const isCompact = !expanded || isCompactLandscape;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-white border-r border-slate-200/80 shrink-0 sticky top-0 h-[100dvh] z-30 transition-[width] duration-200 ease-out",
        isCompact ? "w-16" : "w-64"
      )}
      aria-label="Главное меню"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-slate-200/80">
        {!isCompact && (
          <div className="flex items-center space-x-2 pl-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              S
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Saida Med
              </span>
              <span className="text-[10px] text-slate-400">AI-медицинский</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center text-slate-500 hover:bg-slate-100 ml-auto"
          aria-label={expanded ? "Свернуть меню" : "Развернуть меню"}
          aria-hidden={isCompactLandscape}
        >
          {expanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick add material */}
      <div className={cn("px-2 py-3", isCompact ? "px-2" : "px-3")}>
        <Link
          href="/library"
          className={cn(
            "flex items-center gap-2 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold transition-colors ios-press",
            isCompact ? "w-12 h-12 justify-center mx-auto" : "w-full h-11 px-3"
          )}
          aria-label="Добавить материал"
          title="Добавить материал"
        >
          <Plus className={cn("shrink-0", isCompact ? "w-5 h-5" : "w-4 h-4")} />
          {!isCompact && <span className="text-sm">Добавить материал</span>}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto no-scrollbar">
        {navItems
          .filter((item) => !(isCompact && item.secondary))
          .map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label + item.href + item.secondary}
                href={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl transition-colors duration-150 ios-press",
                  isCompact
                    ? "w-12 h-12 mx-auto justify-center"
                    : "h-11 px-3 gap-3",
                  isActive
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                title={isCompact ? item.label : undefined}
              >
                {isActive && (
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-teal-600",
                      isCompact ? "h-6" : "h-7"
                    )}
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={cn(
                    "shrink-0",
                    isCompact ? "w-5 h-5" : "w-5 h-5",
                    isActive ? "text-teal-700" : "text-slate-500 group-hover:text-slate-700"
                  )}
                />
                {!isCompact && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Profile section */}
      <div className="border-t border-slate-200/80 px-3 py-3">
        <Link
          href="/profile"
          className={cn(
            "flex items-center rounded-xl transition-colors ios-press",
            isCompact
              ? "w-12 h-12 mx-auto justify-center bg-teal-50"
              : "gap-3 p-2 hover:bg-slate-50"
          )}
          title={isCompact ? "Профиль Саиды" : undefined}
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-900 font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          {!isCompact && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">Саида</p>
                <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60 text-amber-700 text-[11px] font-bold">
                  <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                  12
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">Студентка-медик</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
