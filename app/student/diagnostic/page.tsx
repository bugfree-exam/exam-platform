import Link from "next/link";

import { DiagnosticRunner, StartDiagnosticButton } from "@/components/student/DiagnosticRunner";
import { requireStudentPage } from "@/lib/access";
import { getPublishedDiagnosticTemplate } from "@/lib/course";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentDiagnosticPage() {
  const user = await requireStudentPage();
  const [profile, template] = await Promise.all([
    prisma.studentPreparationProfile.findUnique({ where: { studentId: user.id } }),
    getPublishedDiagnosticTemplate(user.id),
  ]);
  const diagnostic = template
    ? await prisma.studentDiagnosticAttempt.findFirst({
      where: { studentId: user.id, templateId: template.id },
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
    })
    : null;

  if (!profile) {
    return <main className="min-h-screen bg-[#f3f7fa] px-4 py-8"><div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8"><h1 className="text-3xl font-black">Сначала настроим цель</h1><p className="mt-3 text-slate-600">Диагностика имеет смысл только вместе со сроком и реальным временем на подготовку.</p><Link href="/student/start" className="mt-6 inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white">Пройти онбординг →</Link></div></main>;
  }

  if (!template) {
    return <main className="min-h-screen bg-[#f3f7fa] px-4 py-8"><div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8"><h1 className="text-3xl font-black">Входной контроль готовит преподаватель</h1><p className="mt-3 leading-7 text-slate-600">Набор будет одинаковым для всей группы и включит задания разных уровней. Как только преподаватель опубликует его, здесь появится кнопка старта.</p><Link href="/student" className="mt-6 inline-flex rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white">Вернуться в кабинет</Link></div></main>;
  }

  const completed = diagnostic?.status === "COMPLETED";
  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link>
        <header className="mt-4 rounded-[32px] bg-[#092535] p-7 text-white sm:p-10"><div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">shared.entry.control · v{template.version}</div><h1 className="mt-3 text-3xl font-black sm:text-5xl">{template.title}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{template.description || "Единый разноуровневый входной контроль для всех учеников курса."} Примерное время — {template.durationMinutes} минут.</p></header>
        {!diagnostic ? <section className="mt-6 rounded-[28px] bg-white p-7"><h2 className="text-2xl font-black">Одинаковые условия для всей группы</h2><p className="mt-3 text-sm leading-6 text-slate-600">Преподаватель заранее выбрал порядок и уровни заданий. Решайте самостоятельно, без подсказок и поиска ответов; незнакомые задания можно пропустить.</p><StartDiagnosticButton /></section> : completed ? <section className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-7"><div className="text-sm font-black text-emerald-700">Диагностика завершена</div><h2 className="mt-2 text-3xl font-black text-emerald-950">{diagnostic.score} из {diagnostic.maxScore}</h2><p className="mt-3 text-sm leading-6 text-emerald-800">Точка старта зафиксирована. Результат покажет пробелы и поможет преподавателю, но не изменит общий порядок годового курса.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/student/route" className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-black text-white">Открыть курс →</Link><Link href="/student/skills" className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-black text-emerald-900">Карта навыков</Link></div></section> : <DiagnosticRunner diagnosticId={diagnostic.id} tasks={diagnostic.items.map((item) => ({ id: item.id, egeNumber: item.taskRevision.egeNumber, title: item.taskRevision.title, statementHtml: item.taskRevision.statementHtml, answerType: item.taskRevision.answerType, attachments: item.taskRevision.attachments.map((link) => ({ id: link.attachment.id, originalName: link.attachment.originalName })) }))} />}
      </div>
    </main>
  );
}
