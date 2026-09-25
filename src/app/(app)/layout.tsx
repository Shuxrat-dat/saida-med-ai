import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopHeader } from "@/components/layout/TopHeader";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { ProgressRightPanel } from "@/components/layout/ProgressRightPanel";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] min-h-[100svh] bg-slate-50 flex flex-col md:flex-row antialiased">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative landscape-mobile-compact">
        <TopHeader />
        <div className="flex flex-row flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {children}
          </div>
          <ProgressRightPanel />
        </div>
        <MobileBottomNav />
      </div>
    </div>
  );
}
