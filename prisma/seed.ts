import {
  HomeworkStatus,
  PrismaClient,
  TaskAnswerType,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.homeworkAssignment.deleteMany();
  await prisma.homeworkTask.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

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

  const task1 = await prisma.task.create({
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
  });

  const task2 = await prisma.task.create({
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
  });

  const homework = await prisma.homework.create({
    data: {
      title: "Тестовое домашнее задание",
      description: "Первое ДЗ для проверки платформы.",
      status: HomeworkStatus.ASSIGNED,
      tasks: {
        create: [
          {
            taskId: task1.id,
            order: 1,
          },
          {
            taskId: task2.id,
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