import Link from "next/link";

import { TelegramReminderSettings } from "@/components/student/TelegramReminderSettings";
import { requireStudentPage } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function StudentTelegramPage() {
  await requireStudentPage();

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/student" className="text-sm font-bold text-slate-600">
            ← В кабинет
          </Link>
          <Link
            href="/student/homeworks"
            className="text-sm font-bold text-cyan-700"
          >
            Домашние задания
          </Link>
        </nav>

        <header className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            notifications.telegram
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Напоминания в Telegram
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Подключи Telegram один раз. Бот напомнит о несданном домашнем
            задании или назначенном варианте за сутки до дедлайна и один раз
            после просрочки.
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <TelegramReminderSettings />
        </section>

        <section className="mt-5 rounded-3xl border border-cyan-100 bg-cyan-50/70 p-5 text-sm leading-6 text-slate-600">
          <div className="font-bold text-slate-950">Как это работает</div>
          <p className="mt-2">
            Напоминание отправляется только пока работа не сдана. Повторные
            технические проверки не создают дубликаты. Если преподаватель
            изменит дедлайн, новый срок будет учтён отдельно.
          </p>
        </section>
      </div>
    </main>
  );
}
