import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { checkAnswer } from "@/lib/checkAnswer";
import { getCurrentUser } from "@/lib/auth";
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

async function requireStudent() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Не авторизован" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "STUDENT") {
    return {
      user: null,
      response: NextResponse.json(
        { message: "Недостаточно прав" },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStudent();

    if (response || !user) {
      return response;
    }

    const { id: homeworkId } = await context.params;

    const body = await request.json();
    const parsed = submitHomeworkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный формат ответов" },
        { status: 400 }
      );
    }

    const homework = await prisma.homework.findFirst({
      where: {
        id: homeworkId,
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
        { message: "Домашнее задание не найдено" },
        { status: 404 }
      );
    }

    if (homework.tasks.length === 0) {
      return NextResponse.json(
        { message: "В домашнем задании нет задач" },
        { status: 400 }
      );
    }

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
        error: result.error ?? null,
      };
    });

    const score = checkedAnswers.filter((answer) => answer.isCorrect).length;
    const maxScore = checkedAnswers.length;
    const percent = Math.round((score / maxScore) * 100);

    const attempt = await prisma.attempt.create({
      data: {
        homeworkId: homework.id,
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
          orderBy: {
            task: {
              egeNumber: "asc",
            },
          },
        },
      },
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percent: attempt.percent,
        submittedAt: attempt.submittedAt,
        answers: attempt.answers.map((answer) => ({
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