import React from "react";
import { cn } from "@/lib/utils/cn";

interface SafeContainerProps {
  children: React.ReactNode;
  className?: string;
  hasBottomNav?: boolean;
}

export function SafeContainer({
  children,
  className,
  hasBottomNav = true,
}: SafeContainerProps) {
  return (
    <main
      className={cn(
        "w-full max-w-md mx-auto px-4 min-h-[100dvh] flex flex-col",
        hasBottomNav ? "pb-24 pt-3" : "pb-8 pt-3",
        className
      )}
    >
      {children}
    </main>
  );
}
