import type { ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { Topbar } from "@/components/app-shell/Topbar";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 max-w-[1100px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
