import Link from "next/link";
import { notFound } from "next/navigation";

import { HomeworkForm } from "@/components/homeworks/HomeworkForm";
import { prisma } from "@/lib/prisma";

type EditHomeworkPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTimeLocal(date: Date | null) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function EditHomeworkPage({
  params,
}: EditHomeworkPageProps) {
  const { id } = await params;

  const [homework, tasks, students] = await Promise.all([
    prisma.homework.findUnique({
      where: {
        id,
      },
      include: {
        tasks: {
          orderBy: {
            order: "asc",
          },
          include: {
            task: {
              select: {
                id: true,
                egeNumber: true,
                title: true,
                difficulty: true,
                isArchived: true,
              },
            },
          },
        },
        assignments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        attempts: {
          where: {
            status: "SUBMITTED",
          },
          select: {
            id: true,
          },
        },
      },
    }),

    prisma.task.findMany({
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
    }),

    prisma.user.findMany({
      where: {
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!homework) {
    notFound();
  }

  const activeHomeworkTasks = homework.tasks.filter(
    (homeworkTask) => !homeworkTask.task.isArchived
  );

  const extraTasksFromHomework = activeHomeworkTasks
    .map((homeworkTask) => ({
      id: homeworkTask.task.id,
      egeNumber: homeworkTask.task.egeNumber,
      title: homeworkTask.task.title,
      difficulty: homeworkTask.task.difficulty,
    }))
    .filter((taskFromHomework) =>
      tasks.every((task) => task.id !== taskFromHomework.id)
    );

  const allTasks = [...tasks, ...extraTasksFromHomework];

  const extraStudentsFromHomework = homework.assignments
    .map((assignment) => assignment.student)
    .filter((studentFromHomework) =>
      students.every((student) => student.id !== studentFromHomework.id)
    );

  const allStudents = [...students, ...extraStudentsFromHomework];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <Link
            href={`/teacher/homeworks/${homework.id}`}
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← К домашнему заданию
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Редактирование ДЗ
          </h1>

          <p className="mt-2 text-slate-600">
            Измени параметры, задачи, порядок и список учеников.
          </p>
        </header>

        <HomeworkForm
          mode="edit"
          tasks={allTasks}
          students={allStudents}
          initialData={{
            id: homework.id,
            title: homework.title,
            description: homework.description ?? "",
            deadline: formatDateTimeLocal(homework.deadline),
            taskIds: activeHomeworkTasks.map(
              (homeworkTask) => homeworkTask.taskId
            ),
            studentIds: homework.assignments.map(
              (assignment) => assignment.studentId
            ),
            attemptsCount: homework.attempts.length,
          }}
        />
      </div>
    </main>
  );
}