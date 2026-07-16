import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { checkAnswer } from "@/lib/checkAnswer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const submitHomeworkSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    /*
     * Проверяем роль непосредственно внутри API.
     * Одного middleware для защиты недостаточно.
     */
    const auth = await requireApiRole(UserRole.STUDENT);

    if (!auth.ok) {
      return auth.response;
    }

    const user = auth.user;
    const { id: homeworkId } = await context.params;

    const body = await request.json();
    const parsed = submitHomeworkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный формат ответов" },
        { status: 400 }
      );
    }

    /*
     * ДЗ доступно только при одновременном выполнении условий:
     *
     * 1. ДЗ существует.
     * 2. Оно находится в активном статусе ASSIGNED.
     * 3. Оно назначено текущему ученику.
     *
     * Возвращаем 404, а не 403, чтобы не раскрывать существование чужого ДЗ.
     */
    const homework = await prisma.homework.findFirst({
      where: {
        id: homeworkId,
        status: "ASSIGNED",
        assignments: {
          some: {
            studentId: user.id,
          },
        },
      },
      include: {
        tasks: {
          orderBy: {
            order: "asc",
          },
          include: {
            task: true,
          },
        },
      },
    });

    if (!homework) {
      return NextResponse.json(
        { message: "Домашнее задание не найдено или недоступно" },
        { status: 404 }
      );
    }

    if (homework.tasks.length === 0) {
      return NextResponse.json(
        { message: "В домашнем задании нет задач" },
        { status: 400 }
      );
    }

    /*
     * Проверяем только те задачи, которые реально входят в это ДЗ.
     * Лишние taskId из тела запроса игнорируются.
     */
    const checkedAnswers = homework.tasks.map((homeworkTask) => {
      const task = homeworkTask.task;
      const studentAnswerText = parsed.data.answers[task.id] ?? "";

      const result = checkAnswer({
        answerType: task.answerType,
        correctAnswer: task.correctAnswer,
        studentAnswerText,
      });

      return {
        task,
        rawAnswer: studentAnswerText,
        normalizedAnswer: result.normalizedStudentAnswer,
        isCorrect: result.isCorrect,
      };
    });

    const score = checkedAnswers.filter((answer) => answer.isCorrect).length;
    const maxScore = checkedAnswers.length;
    const percent = Math.round((score / maxScore) * 100);

    /*
     * Порядок задач из HomeworkTask сохраняем отдельно,
     * чтобы результат отображался в том же порядке, что и само ДЗ.
     */
    const taskOrderById = new Map(
      homework.tasks.map((homeworkTask, index) => [
        homeworkTask.taskId,
        index,
      ])
    );

    const attempt = await prisma.attempt.create({
      data: {
        homeworkId: homework.id,

        /*
         * Критично: studentId берётся исключительно из JWT-сессии.
         * Никогда не принимаем studentId из request body.
         */
        studentId: user.id,

        status: "SUBMITTED",
        score,
        maxScore,
        percent,
        submittedAt: new Date(),

        answers: {
          create: checkedAnswers.map((answer) => ({
            task: {
              connect: {
                id: answer.task.id,
              },
            },
            rawAnswer: answer.rawAnswer,
            normalizedAnswer:
              answer.normalizedAnswer === null
                ? Prisma.JsonNull
                : answer.normalizedAnswer,
            isCorrect: answer.isCorrect,
          })),
        },
      },
      include: {
        answers: {
          include: {
            task: {
              select: {
                id: true,
                egeNumber: true,
                title: true,
                answerType: true,
                correctAnswer: true,
                explanationHtml: true,
              },
            },
          },
        },
      },
    });

    const orderedAnswers = [...attempt.answers].sort((first, second) => {
      const firstOrder =
        taskOrderById.get(first.taskId) ?? Number.MAX_SAFE_INTEGER;
      const secondOrder =
        taskOrderById.get(second.taskId) ?? Number.MAX_SAFE_INTEGER;

      return firstOrder - secondOrder;
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percent: attempt.percent,
        submittedAt: attempt.submittedAt,

        /*
         * Правильные ответы возвращаются только после успешного создания
         * попытки. До отправки ДЗ этот API их не раскрывает.
         */
        answers: orderedAnswers.map((answer) => ({
          taskId: answer.taskId,
          task: {
            id: answer.task.id,
            egeNumber: answer.task.egeNumber,
            title: answer.task.title,
            answerType: answer.task.answerType,
            correctAnswer: answer.task.correctAnswer,
            explanationHtml: answer.task.explanationHtml,
          },
          rawAnswer: answer.rawAnswer,
          normalizedAnswer: answer.normalizedAnswer,
          isCorrect: answer.isCorrect,
        })),
      },
    });
  } catch (error) {
    console.error("[STUDENT_HOMEWORK_SUBMIT]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при отправке домашнего задания" },
      { status: 500 }
    );
  }
}