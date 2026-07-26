import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth";

type SectionIconName = "homeworks" | "results" | "webinars";

type StudentSection = {
  href: string;
  number: string;
  route: string;
  label: string;
  title: string;
  description: string;
  status: string;
  icon: SectionIconName;
};

const studentSections: StudentSection[] = [
  {
    href: "/student/homeworks",
    number: "01",
    route: "/homeworks",
    label: "Практика",
    title: "Домашние задания",
    description:
      "Открывайте назначенные работы, отправляйте решения и возвращайтесь к результатам.",
    status: "assigned",
    icon: "homeworks",
  },
  {
    href: "/student/results",
    number: "02",
    route: "/results",
    label: "Аналитика",
    title: "Результаты и ошибки",
    description:
      "Смотрите историю попыток, правильные ответы и задания, которые стоит повторить.",
    status: "tracked",
    icon: "results",
  },
  {
    href: "/student/webinars",
    number: "03",
    route: "/webinars",
    label: "Материалы курса",
    title: "Вебинары и конспекты",
    description:
      "Записи занятий, презентации, шпаргалки и дополнительные материалы в одном месте.",
    status: "available",
    icon: "webinars",
  },
];

function SectionIcon({ name }: { name: SectionIconName }) {
  if (name === "homeworks") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
      >
        <path
          d="M7 3.75h10A2.25 2.25 0 0 1 19.25 6v12A2.25 2.25 0 0 1 17 20.25H7A2.25 2.25 0 0 1 4.75 18V6A2.25 2.25 0 0 1 7 3.75Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "results") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6"
      >
        <path
          d="M5 19V9m7 10V5m7 14v-7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="m4.5 7.5 5-3 4 2.5 6-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
    >
      <rect
        x="3.75"
        y="5.25"
        width="16.5"
        height="13.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m10 9 5 3-5 3V9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function StudentPage() {
  const user = await getCurrentUser();

  const fullName = user?.name?.trim() || "Ученик";
  const firstName = fullName.split(" ")[0];
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f3f7fa] text-[#102638]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 78, 105, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(23, 78, 105, 0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-96 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="flex items-center justify-between gap-4 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_18px_50px_rgba(16,38,56,0.06)] backdrop-blur-xl sm:px-5">
          <Link
            href="/student"
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b2436] font-mono text-sm font-bold text-cyan-300 shadow-sm transition-transform group-hover:-rotate-3">
              {"</>"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-[-0.01em] text-[#102638] sm:text-base">
                Экзамен без багов
              </span>
              <span className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:block">
                student learning platform
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-[#102638]">{fullName}</p>
              <p className="max-w-48 truncate text-xs text-slate-500">
                {user?.email || "Личный кабинет ученика"}
              </p>
            </div>
            <div className="[&_button]:rounded-xl [&_button]:border [&_button]:border-slate-200 [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-slate-600 [&_button]:shadow-sm [&_button]:transition [&_button:hover]:border-slate-300 [&_button:hover]:text-slate-950">
              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
          <div className="relative overflow-hidden rounded-[32px] bg-[#0a2435] px-6 py-7 text-white shadow-[0_28px_80px_rgba(7,31,47,0.22)] sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
            />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
                <span>app.bugfree-exam.ru/student</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  active
                </span>
              </div>

              <div className="mt-8 max-w-3xl">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Student_dashboard
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                  Добро пожаловать, {firstName}!
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Здесь собраны задания, результаты и материалы курса. Выберите
                  раздел и продолжайте подготовку с того места, где остановились.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/student/homeworks"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#082334] shadow-[0_12px_30px_rgba(103,232,249,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                >
                  Открыть домашние задания
                  <ArrowIcon />
                </Link>
                <Link
                  href="/student/webinars"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Перейти к материалам
                </Link>
              </div>

              <div className="mt-9 grid gap-2 border-t border-white/10 pt-6 font-mono text-[11px] text-slate-400 sm:grid-cols-3 sm:text-xs">
                <div>
                  <span className="text-slate-600">01</span>{" "}
                  homework_tracking: <span className="text-emerald-300">enabled</span>
                </div>
                <div>
                  <span className="text-slate-600">02</span>{" "}
                  results: <span className="text-emerald-300">visible</span>
                </div>
                <div>
                  <span className="text-slate-600">03</span>{" "}
                  materials: <span className="text-emerald-300">available</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col rounded-[32px] border border-white/90 bg-white/90 p-6 shadow-[0_24px_70px_rgba(16,38,56,0.08)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                /student/profile
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                secure
              </span>
            </div>

            <div className="mt-7 flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e6f8fb] font-mono text-lg font-bold text-[#0e7181]">
                {initials || "У"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold tracking-[-0.02em] text-[#102638]">
                  {fullName}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {user?.email || "Ученик курса"}
                </p>
              </div>
            </div>

            <div className="my-6 h-px bg-slate-100" />

            <div>
              <p className="text-sm font-bold text-[#102638]">
                Система подготовки активна
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Все основные разделы доступны в личном кабинете и связаны в
                единый учебный маршрут.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {[
                ["Задания", "ready"],
                ["Результаты", "tracked"],
                ["Материалы", "online"],
              ].map(([label, status]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3"
                >
                  <span className="text-sm font-medium text-slate-600">
                    {label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700">
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-10 pb-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-700">
                01 / разделы платформы
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[#102638] sm:text-3xl">
                Продолжить подготовку
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500 sm:text-right">
              Задания, обратная связь и учебные материалы находятся в одном
              кабинете — без потерянных ссылок и переписок.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {studentSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group relative flex min-h-[292px] flex-col overflow-hidden rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_18px_50px_rgba(16,38,56,0.07)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_24px_60px_rgba(16,38,56,0.12)] sm:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400">
                    {section.number} {section.route}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 transition group-hover:bg-cyan-50 group-hover:text-cyan-800">
                    {section.status}
                  </span>
                </div>

                <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f8fb] text-[#0e7181] transition duration-300 group-hover:scale-105 group-hover:bg-cyan-300 group-hover:text-[#082334]">
                  <SectionIcon name={section.icon} />
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    {section.label}
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-[-0.025em] text-[#102638]">
                    {section.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {section.description}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-bold text-[#102638]">
                  <span>Открыть раздел</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 transition group-hover:border-[#0a2435] group-hover:bg-[#0a2435] group-hover:text-white">
                    <ArrowIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#cde4ea] bg-[#eaf7f9]/80 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0e7181]">
                learning_cycle
              </p>
              <h2 className="mt-2 text-lg font-bold tracking-[-0.02em] text-[#102638]">
                Каждый этап подготовки связан со следующим
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600 sm:text-xs">
              {[
                "занятие",
                "практика",
                "проверка",
                "разбор ошибок",
                "следующий шаг",
              ].map((step, index, steps) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="rounded-lg border border-white/80 bg-white/70 px-2.5 py-1.5 shadow-sm">
                    {step}
                  </span>
                  {index < steps.length - 1 ? (
                    <span className="text-[#0e7181]">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 px-1 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© Экзамен без багов</span>
          <span className="font-mono">preparation_system: active</span>
        </footer>
      </div>
    </main>
  );
}