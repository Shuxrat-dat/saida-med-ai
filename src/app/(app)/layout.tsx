import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { TopHeader } from "@/components/layout/TopHeader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative antialiased">
      <TopHeader />
      <div className="flex-1 flex flex-col">{children}</div>
      <MobileBottomNav />
    </div>
  );
}
