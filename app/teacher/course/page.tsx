import Link from "next/link";

import { AnnualCourseEditor } from "@/components/teacher/AnnualCourseEditor";
import { requireTeacherPage } from "@/lib/access";
import { getTeacherCourseWorkspace } from "@/lib/course";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherCoursePage() {
  await requireTeacherPage();
  const [course, tasks] = await Promise.all([
    getTeacherCourseWorkspace(),
    prisma.task.findMany({
      where: { isArchived: false, currentRevisionId: { not: null } },
      orderBy: [{ egeNumber: "asc" }, { difficulty: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        egeNumber: true,
        title: true,
        difficulty: true,
        currentRevision: { select: { version: true } },
      },
    }),
  ]);

  const courseView = course
    ? {
        id: course.id,
        title: course.title,
        description: course.description,
        startDate: course.startDate.toISOString(),
        endDate: course.endDate.toISOString(),
        status: course.status,
        enrolledStudents: course._count.enrollments,
        modules: course.modules.map((module) => ({
          id: module.id,
          order: module.order,
          title: module.title,
          description: module.description,
          startDate: module.startDate.toISOString(),
          endDate: module.endDate.toISOString(),
          egeNumbers: module.egeNumbers as number[],
        })),
        scheduleItems: course.scheduleItems.map((item) => ({
          id: item.id,
          moduleId: item.moduleId,
          order: item.order,
          type: item.type,
          title: item.title,
          description: item.description,
          scheduledFor: item.scheduledFor.toISOString(),
          estimatedMinutes: item.estimatedMinutes,
          href: item.href,
          egeNumbers: item.egeNumbers as number[],
        })),
        diagnostics: course.diagnosticTemplates.map((template) => ({
          id: template.id,
          title: template.title,
          description: template.description,
          durationMinutes: template.durationMinutes,
          version: template.version,
          status: template.status,
          items: template.items.map((item) => ({
            id: item.id,
            taskId: item.taskId,
            order: item.order,
            level: item.level,
            points: item.points,
            taskRevision: item.taskRevision,
          })),
        })),
      }
    : null;

  return (
    <main className="min-h-screen bg-slate-100/70 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/teacher" className="text-sm font-bold text-cyan-700">← В кабинет учителя</Link>
        <header className="mt-4 overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">teacher.course_control</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Авторский маршрут курса</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">Вы определяете последовательность тем, общий входной контроль и точное расписание. Платформа не перестраивает программу за вас — она помогает ученику пройти её с учётом ошибок и пропусков.</p>
        </header>
        <div className="mt-6">
          <AnnualCourseEditor
            course={courseView}
            tasks={tasks.flatMap((task) => task.currentRevision ? [{
              id: task.id,
              egeNumber: task.egeNumber,
              title: task.title,
              difficulty: task.difficulty,
              revisionVersion: task.currentRevision.version,
            }] : [])}
          />
        </div>
      </div>
    </main>
  );
}
