"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, HelpCircle, Layers, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/library", label: "Материалы", icon: BookOpen },
  { href: "/quiz", label: "Тесты", icon: HelpCircle },
  { href: "/flashcards", label: "Карточки", icon: Layers },
  { href: "/progress", label: "Прогресс", icon: BarChart2 },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-slate-200/80 safe-area-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center py-1 px-3 text-xs font-medium transition-colors duration-150 ios-press"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? "text-teal-700 scale-110"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-teal-600 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={`mt-1 text-[11px] tracking-tight ${
                  isActive
                    ? "font-semibold text-teal-800"
                    : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
