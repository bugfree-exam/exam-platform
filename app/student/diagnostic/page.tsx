import Link from "next/link";

import { DiagnosticRunner, StartDiagnosticButton } from "@/components/student/DiagnosticRunner";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentDiagnosticPage() {
  const user = await requireStudentPage();
  const [profile, diagnostic] = await Promise.all([
    prisma.studentPreparationProfile.findUnique({ where: { studentId: user.id } }),
    prisma.studentDiagnosticAttempt.findFirst({
      where: { studentId: user.id },
      orderBy: { startedAt: "desc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            taskRevision: {
              include: {
                attachments: { orderBy: { order: "asc" }, include: { attachment: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!profile) {
    return <main className="min-h-screen bg-[#f3f7fa] px-4 py-8"><div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8"><h1 className="text-3xl font-black">Сначала настроим цель</h1><p className="mt-3 text-slate-600">Диагностика имеет смысл только вместе со сроком и реальным временем на подготовку.</p><Link href="/student/start" className="mt-6 inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white">Пройти онбординг →</Link></div></main>;
  }

  const completed = diagnostic?.status === "COMPLETED";
  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link>
        <header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10"><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">start.diagnostic</div><h1 className="mt-3 text-3xl font-black sm:text-5xl">Входная диагностика</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Это не экзамен и не оценка способностей. Диагностика определит точку старта и не позволит маршруту отправить вас в темы без необходимой базы.</p></header>
        {!diagnostic ? <section className="mt-6 rounded-[28px] bg-white p-7"><h2 className="text-2xl font-black">Одна задача на ключевые блоки</h2><p className="mt-3 text-sm leading-6 text-slate-600">Решайте самостоятельно, без подсказок и поиска ответов. Незнакомые задания можно пропустить.</p><StartDiagnosticButton /></section> : completed ? <section className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-7"><div className="text-sm font-black text-emerald-700">Диагностика завершена</div><h2 className="mt-2 text-3xl font-black text-emerald-950">{diagnostic.score} из {diagnostic.maxScore}</h2><p className="mt-3 text-sm leading-6 text-emerald-800">Маршрут построен. Результат — только стартовая точка; освоение подтверждается несколькими независимыми задачами.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/student/route" className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-black text-white">Открыть маршрут →</Link><Link href="/student/skills" className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-black text-emerald-900">Карта навыков</Link></div></section> : <DiagnosticRunner diagnosticId={diagnostic.id} tasks={diagnostic.items.map((item) => ({ id: item.id, egeNumber: item.taskRevision.egeNumber, title: item.taskRevision.title, statementHtml: item.taskRevision.statementHtml, answerType: item.taskRevision.answerType, attachments: item.taskRevision.attachments.map((link) => ({ id: link.attachment.id, originalName: link.attachment.originalName })) }))} />}
      </div>
    </main>
  );
}
