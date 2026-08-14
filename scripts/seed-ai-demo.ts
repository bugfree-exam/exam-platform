import {
  AttemptStatus,
  HomeworkStatus,
  Prisma,
  PrismaClient,
  TaskAnswerType,
  UserRole,
  VariantStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  AI_DEMO_EMAIL_SUFFIX,
  AI_DEMO_PASSWORD,
  AI_DEMO_PREFIX,
  AI_DEMO_PROFILES,
  materializeDemoAnswers,
} from "../lib/ai/demoProfiles";

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_EGE_NUMBERS = [2, 5, 8, 13, 16] as const;

async function publishInitialRevision<T extends {
  id: string;
  egeNumber: number;
  title: string;
  statementHtml: string;
  referenceHtml: string | null;
  answerType: TaskAnswerType;
  correctAnswer: Prisma.JsonValue;
  hintHtml: string | null;
  explanationHtml: string | null;
  videoUrl: string | null;
  source: string | null;
  difficulty: number | null;
  skillTag: string | null;
  isPublic: boolean;
}>(task: T) {
  const revision = await prisma.taskRevision.create({
    data: {
      taskId: task.id,
      version: 1,
      egeNumber: task.egeNumber,
      title: task.title,
      statementHtml: task.statementHtml,
      referenceHtml: task.referenceHtml,
      answerType: task.answerType,
      correctAnswer: task.correctAnswer as Prisma.InputJsonValue,
      hintHtml: task.hintHtml,
      explanationHtml: task.explanationHtml,
      videoUrl: task.videoUrl,
      source: task.source,
      difficulty: task.difficulty,
      skillTag: task.skillTag,
      isPublic: task.isPublic,
      changeNote: "Исходная demo-версия",
    },
  });
  await prisma.task.update({
    where: { id: task.id },
    data: { currentRevisionId: revision.id },
  });
  return { ...task, currentRevisionId: revision.id };
}

function assertLocalDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Демонстрационные данные запрещено создавать в production.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL не задан. Проверь локальный файл .env.");
  }

  const hostname = new URL(databaseUrl).hostname;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!localHosts.has(hostname)) {
    throw new Error(
      `Скрипт работает только с локальной БД. Текущий хост: ${hostname}`
    );
  }
}

async function clearDemoData() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL app.allow_task_revision_mutation = 'on'");
    await tx.user.deleteMany({
      where: { email: { endsWith: AI_DEMO_EMAIL_SUFFIX } },
    });
    await tx.homework.deleteMany({
      where: { title: { startsWith: AI_DEMO_PREFIX } },
    });
    await tx.examVariant.deleteMany({
      where: { title: { startsWith: AI_DEMO_PREFIX } },
    });
    const demoTasks = await tx.task.findMany({
      where: { title: { startsWith: AI_DEMO_PREFIX } },
      select: { id: true },
    });
    const demoTaskIds = demoTasks.map((task) => task.id);
    await tx.task.updateMany({
      where: { id: { in: demoTaskIds } },
      data: { currentRevisionId: null },
    });
    await tx.taskRevisionAttachment.deleteMany({
      where: { revision: { taskId: { in: demoTaskIds } } },
    });
    await tx.taskRevision.deleteMany({
      where: { taskId: { in: demoTaskIds } },
    });
    await tx.taskAttachment.deleteMany({
      where: { taskId: { in: demoTaskIds } },
    });
    await tx.task.deleteMany({
      where: { title: { startsWith: AI_DEMO_PREFIX } },
    });
  });
}

async function createDemoTasks() {
  const tasks = await Promise.all(
    DEMO_EGE_NUMBERS.map((egeNumber) =>
      prisma.task.create({
        data: {
          egeNumber,
          title: `${AI_DEMO_PREFIX} Задание №${egeNumber}`,
          statementHtml: `<p>Локальная демонстрационная задача №${egeNumber} для проверки AI Assistant.</p>`,
          answerType: TaskAnswerType.NUMBER,
          correctAnswer: 1,
          explanationHtml: "<p>Правильный демонстрационный ответ: 1.</p>",
          source: AI_DEMO_PREFIX,
          difficulty: 1,
          isPublic: false,
        },
      }).then(publishInitialRevision)
    )
  );

  return new Map(tasks.map((task) => [task.egeNumber, task]));
}

async function createMixedActivity(input: {
  studentId: string;
  tasks: Awaited<ReturnType<typeof createDemoTasks>>;
  now: Date;
}) {
  const taskList = DEMO_EGE_NUMBERS.map((egeNumber) => input.tasks.get(egeNumber)!);
  const homework = await prisma.homework.create({
    data: {
      title: `${AI_DEMO_PREFIX} Смешанное домашнее задание`,
      description: "Данные только для локальной проверки AI Assistant.",
      status: HomeworkStatus.ASSIGNED,
      tasks: {
        create: taskList.map((task, index) => ({
          taskId: task.id,
          taskRevisionId: task.currentRevisionId,
          order: index + 1,
        })),
      },
      assignments: { create: { studentId: input.studentId } },
    },
  });

  const homeworkPatterns = [
    [false, false, false, false, false],
    [true, false, true, false, false],
    [true, true, true, false, true],
  ];

  for (const [index, pattern] of homeworkPatterns.entries()) {
    const score = pattern.filter(Boolean).length;
    const submittedAt = new Date(input.now.getTime() - (18 - index * 8) * DAY_MS);
    await prisma.attempt.create({
      data: {
        homeworkId: homework.id,
        studentId: input.studentId,
        status: AttemptStatus.SUBMITTED,
        score,
        maxScore: pattern.length,
        percent: Math.round((score / pattern.length) * 100),
        startedAt: new Date(submittedAt.getTime() - 30 * 60 * 1000),
        submittedAt,
        answers: {
          create: taskList.map((task, taskIndex) => ({
            taskId: task.id,
            taskRevisionId: task.currentRevisionId,
            rawAnswer: pattern[taskIndex] ? 1 : 0,
            normalizedAnswer: pattern[taskIndex] ? 1 : 0,
            isCorrect: pattern[taskIndex],
            countsForMastery: index === 0,
          })),
        },
      },
    });
  }

  const variant = await prisma.examVariant.create({
    data: {
      title: `${AI_DEMO_PREFIX} Вариант с ростом результата`,
      description: "Данные только для локальной проверки AI Assistant.",
      status: VariantStatus.PUBLISHED,
      durationMinutes: 235,
      tasks: {
        create: taskList.map((task, index) => ({
          taskId: task.id,
          taskRevisionId: task.currentRevisionId,
          order: index + 1,
          points: 1,
        })),
      },
      assignments: { create: { studentId: input.studentId } },
    },
  });

  const variantPatterns = [
    [true, false, false, false, false],
    [true, true, true, false, false],
    [true, true, true, true, true],
  ];

  for (const [index, pattern] of variantPatterns.entries()) {
    const score = pattern.filter(Boolean).length;
    const submittedAt = new Date(input.now.getTime() - (20 - index * 8) * DAY_MS);
    await prisma.variantAttempt.create({
      data: {
        variantId: variant.id,
        studentId: input.studentId,
        status: AttemptStatus.SUBMITTED,
        score,
        maxScore: pattern.length,
        percent: Math.round((score / pattern.length) * 100),
        timerEnabled: true,
        startedAt: new Date(submittedAt.getTime() - 60 * 60 * 1000),
        submittedAt,
        answers: {
          create: taskList.map((task, taskIndex) => ({
            taskId: task.id,
            taskRevisionId: task.currentRevisionId,
            rawAnswer: pattern[taskIndex] ? 1 : 0,
            normalizedAnswer: pattern[taskIndex] ? 1 : 0,
            isCorrect: pattern[taskIndex],
            awardedPoints: pattern[taskIndex] ? 1 : 0,
            countsForMastery: false,
          })),
        },
      },
    });
  }
}

async function seedDemoData() {
  await clearDemoData();

  const now = new Date();
  const passwordHash = await bcrypt.hash(AI_DEMO_PASSWORD, 10);
  const tasks = await createDemoTasks();

  for (const profile of AI_DEMO_PROFILES) {
    const student = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    const answers = materializeDemoAnswers(profile, now);
    if (answers.length > 0) {
      const seenTaskIds = new Set<string>();
      await prisma.practiceAttempt.createMany({
        data: answers.map((answer) => {
          const task = tasks.get(answer.egeNumber);
          if (!task) throw new Error(`Нет demo-задачи №${answer.egeNumber}.`);
          const countsForMastery = !seenTaskIds.has(task.id);
          seenTaskIds.add(task.id);
          return {
            studentId: student.id,
            taskId: task.id,
            taskRevisionId: task.currentRevisionId,
            rawAnswer: answer.isCorrect ? 1 : 0,
            normalizedAnswer: answer.isCorrect ? 1 : 0,
            isCorrect: answer.isCorrect,
            countsForMastery,
            createdAt: answer.attemptedAt,
          };
        }),
      });
    }

    if (profile.key === "mixed") {
      await createMixedActivity({ studentId: student.id, tasks, now });
    }
  }
}

async function main() {
  assertLocalDatabase();
  const action = process.argv[2] ?? "seed";

  if (action === "clear") {
    await clearDemoData();
    console.log("AI demo-данные удалены из локальной БД.");
    return;
  }
  if (action !== "seed") {
    throw new Error(`Неизвестное действие: ${action}. Используй seed или clear.`);
  }

  await seedDemoData();
  console.log("AI demo-данные созданы в локальной БД.");
  console.table(
    AI_DEMO_PROFILES.map((profile) => ({
      ученик: profile.name,
      email: profile.email,
      сценарий: profile.description,
    }))
  );
  console.log(`Общий пароль тестовых учеников: ${AI_DEMO_PASSWORD}`);
  console.log("Открой карточки учеников под учителем и сформируй планы.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
