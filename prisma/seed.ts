import {
  HomeworkStatus,
  Prisma,
  PrismaClient,
  TaskAnswerType,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
      changeNote: "Исходная версия seed",
    },
  });
  await prisma.task.update({
    where: { id: task.id },
    data: { currentRevisionId: revision.id },
  });
  return { ...task, currentRevisionId: revision.id };
}

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL app.allow_task_revision_mutation = 'on'");
    await tx.user.deleteMany();
    await tx.homework.deleteMany();
    await tx.examVariant.deleteMany();
    await tx.task.updateMany({ data: { currentRevisionId: null } });
    await tx.taskRevisionAttachment.deleteMany();
    await tx.taskRevision.deleteMany();
    await tx.taskAttachment.deleteMany();
    await tx.task.deleteMany();
  });

  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
  const studentPasswordHash = await bcrypt.hash("student123", 10);

  const teacher = await prisma.user.create({
    data: {
      email: "teacher@example.com",
      name: "Учитель",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: "student@example.com",
      name: "Иван Ученик",
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
    },
  });

  const task1 = await publishInitialRevision(await prisma.task.create({
    data: {
      egeNumber: 5,
      title: "Простая проверка числа",
      statementHtml:
        "<p>Исполнитель получает на вход число <b>N = 10</b>. В ответ запишите число <b>20</b>.</p>",
      answerType: TaskAnswerType.NUMBER,
      correctAnswer: 20,
      explanationHtml: "<p>Это тестовая задача. Правильный ответ: 20.</p>",
      difficulty: 1,
    },
  }));

  const task2 = await publishInitialRevision(await prisma.task.create({
    data: {
      egeNumber: 25,
      title: "Пары чисел с важным порядком",
      statementHtml:
        "<p>Запишите две пары чисел в правильном порядке: сначала <b>1 2</b>, затем <b>3 4</b>.</p>",
      answerType: TaskAnswerType.PAIR_LIST_ORDERED,
      correctAnswer: [
        [1, 2],
        [3, 4],
      ],
      explanationHtml:
        "<p>Порядок пар важен: сначала должна идти пара 1 2, потом 3 4.</p>",
      difficulty: 2,
    },
  }));

  const homework = await prisma.homework.create({
    data: {
      title: "Тестовое домашнее задание",
      description: "Первое ДЗ для проверки платформы.",
      status: HomeworkStatus.ASSIGNED,
      tasks: {
        create: [
          {
            taskId: task1.id,
            taskRevisionId: task1.currentRevisionId,
            order: 1,
          },
          {
            taskId: task2.id,
            taskRevisionId: task2.currentRevisionId,
            order: 2,
          },
        ],
      },
      assignments: {
        create: {
          studentId: student.id,
        },
      },
    },
  });

  console.log("Seed готов.");
  console.log({
    teacherEmail: teacher.email,
    teacherPassword: "teacher123",
    studentEmail: student.email,
    studentPassword: "student123",
    homeworkId: homework.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
