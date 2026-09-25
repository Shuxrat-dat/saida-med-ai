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
        "w-full mx-auto px-3 sm:px-4 lg:px-6 min-h-[100dvh] min-h-[100svh] flex flex-col max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl",
        hasBottomNav ? "pb-24 md:pb-10 pt-3" : "pb-8 md:pb-10 pt-3",
        className
      )}
    >
      {children}
    </main>
  );
}
