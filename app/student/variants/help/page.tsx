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

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-md border border-[#c7c9cc] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Как работать с вариантом</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#3c4043]">
              <li>Сначала просмотрите все 27 заданий и отметьте те, которые решите быстро.</li>
              <li>Сохраняйте ответы по мере решения: платформа также делает автосохранение.</li>
              <li>Сложные задания пропускайте и возвращайтесь к ним после первого прохода.</li>
              <li>Перед отправкой проверьте формат каждого ответа и отсутствие лишних символов.</li>
            </ol>
          </article>

          <article className="rounded-md border border-[#c7c9cc] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Форматы ответов</h2>
            <div className="mt-4 overflow-hidden rounded border border-[#dadce0] text-sm">
              <div className="grid grid-cols-[130px_1fr] border-b border-[#dadce0] bg-[#f8f9fa] p-3 font-bold"><span>Тип</span><span>Как вводить</span></div>
              <div className="grid grid-cols-[130px_1fr] border-b border-[#dadce0] p-3"><span>Одно число</span><code>42</code></div>
              <div className="grid grid-cols-[130px_1fr] border-b border-[#dadce0] p-3"><span>Список</span><code>10 20 30</code></div>
              <div className="grid grid-cols-[130px_1fr] p-3"><span>Пары</span><code className="whitespace-pre-wrap">1 2{"\n"}3 4</code></div>
            </div>
          </article>

          <article className="rounded-md border border-[#c7c9cc] bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold">Файлы, черновик и техническая безопасность</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-[#3c4043] sm:grid-cols-3">
              <div className="rounded bg-[#f8f9fa] p-4"><strong className="block">Файлы задания</strong><span className="mt-1 block">Скачайте их до начала вычислений и не переименовывайте без необходимости.</span></div>
              <div className="rounded bg-[#f8f9fa] p-4"><strong className="block">Черновик</strong><span className="mt-1 block">Записывайте промежуточные значения и отдельно отмечайте задания для проверки.</span></div>
              <div className="rounded bg-[#f8f9fa] p-4"><strong className="block">Сбой связи</strong><span className="mt-1 block">Не закрывайте вкладку. После восстановления соединения проверьте, что ответы сохранились.</span></div>
            </div>
          </article>

          <article className="rounded-md border border-[#f6c26b] bg-[#fff8e1] p-6 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold">Важно</h2>
            <p className="mt-3 text-sm leading-6 text-[#5f4b00]">
              Это справка по работе с тренажёром, а не готовые решения. Если к конкретному заданию приложены данные или разрешённые справочные материалы, они отображаются рядом с его условием.
            </p>
          </article>
        </section>

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
