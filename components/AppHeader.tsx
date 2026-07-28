"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger />
      <Link href="/chat" className="text-2xl leading-none font-bold tracking-wide">
        Dota Watchbuddy
      </Link>
    </header>
  );
}
