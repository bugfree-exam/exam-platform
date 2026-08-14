import "server-only";

import { prisma } from "@/lib/prisma";

export async function getKnownTaskIds(
  studentId: string,
  taskIds?: string[]
): Promise<Set<string>> {
  const taskFilter = taskIds?.length ? { in: taskIds } : undefined;
  const [homework, practice, variants, diagnostic] = await Promise.all([
    prisma.attemptAnswer.findMany({
      where: {
        ...(taskFilter ? { taskId: taskFilter } : {}),
        attempt: { studentId, status: "SUBMITTED" },
      },
      distinct: ["taskId"],
      select: { taskId: true },
    }),
    prisma.practiceAttempt.findMany({
      where: {
        studentId,
        ...(taskFilter ? { taskId: taskFilter } : {}),
      },
      distinct: ["taskId"],
      select: { taskId: true },
    }),
    prisma.variantAttemptAnswer.findMany({
      where: {
        ...(taskFilter ? { taskId: taskFilter } : {}),
        attempt: { studentId, status: "SUBMITTED" },
      },
      distinct: ["taskId"],
      select: { taskId: true },
    }),
    prisma.studentDiagnosticItem.findMany({
      where: {
        ...(taskFilter ? { taskId: taskFilter } : {}),
        attempt: { studentId, status: "COMPLETED" },
      },
      distinct: ["taskId"],
      select: { taskId: true },
    }),
  ]);

  return new Set(
    [...homework, ...practice, ...variants, ...diagnostic].map(
      (item) => item.taskId,
    )
  );
}
