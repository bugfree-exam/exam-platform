import Link from "next/link";

import { VariantForm } from "@/components/variants/VariantForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CreateVariantPage() {
  const tasks = await prisma.task.findMany({
    where: {
      isArchived: false,
    },
    select: {
      id: true,
      egeNumber: true,
      title: true,
      difficulty: true,
    },
    orderBy: [{ egeNumber: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/teacher/variants"
          className="text-sm font-bold text-slate-600 transition hover:text-cyan-700"
        >
          ← К вариантам
        </Link>

        <header className="mt-5 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">
            teacher.variant.builder
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
            Новый вариант ЕГЭ
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Соберите полный вариант вручную или одним нажатием выберите
            случайное задание каждого номера.
          </p>
        </header>

        <div className="mt-6">
          <VariantForm tasks={tasks} />
        </div>
      </div>
    </main>
  );
}
