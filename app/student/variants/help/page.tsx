import Link from "next/link";

import { requireStudentPage } from "@/lib/access";

export default async function StudentVariantHelpPage() {
  await requireStudentPage();

  return (
    <main className="min-h-screen bg-[#e8eaed] px-4 py-6 text-[#202124] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-md border border-[#c7c9cc] bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5f6368]">
            ЕГЭ по информатике
          </div>
          <h1 className="mt-2 text-3xl font-bold">Справочные материалы</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f6368]">
            Эта страница открывается в отдельной вкладке, поэтому ответы и
            таймер текущего варианта продолжают работать.
          </p>
        </header>

        {/* НАЧАЛО РЕДАКТИРУЕМОГО БЛОКА
            Замените содержимое секции ниже своими подсказками.
            Можно добавлять обычный JSX, таблицы, изображения и ссылки. */}
        <section className="mt-5 rounded-md border border-[#c7c9cc] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Добавьте материалы в этот блок</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f6368]">
            Откройте файл{" "}
            <code className="rounded bg-[#f1f3f4] px-1.5 py-1 font-mono text-xs">
              app/student/variants/help/page.tsx
            </code>{" "}
            и замените эту секцию нужным содержимым.
          </p>
        </section>
        {/* КОНЕЦ РЕДАКТИРУЕМОГО БЛОКА */}

        <div className="mt-5">
          <Link
            href="/student/variants"
            className="inline-flex rounded-md border border-[#bdc1c6] bg-white px-4 py-2.5 text-sm font-bold text-[#1967d2] hover:bg-[#f1f3f4]"
          >
            ← К вариантам
          </Link>
        </div>
      </div>
    </main>
  );
}
