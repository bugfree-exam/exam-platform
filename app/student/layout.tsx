import Link from "next/link";
import type { ReactNode } from "react";

import { requireStudentPage } from "@/lib/access";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({
  children,
}: StudentLayoutProps) {
  await requireStudentPage();

  return (
    <>
      {children}
      <Link
        href="/student/telegram"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-lg backdrop-blur transition hover:border-cyan-400 hover:text-cyan-800 sm:bottom-6 sm:right-6 sm:text-sm"
      >
        <span aria-hidden="true">✈</span>
        Напоминания в Telegram
      </Link>
    </>
  );
}
