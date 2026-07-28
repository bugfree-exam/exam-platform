import {
  StudentAccountStatus,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

const deleteStudentSchema = z.object({
  confirmationEmail: z.string().email(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректный статус ученика" },
        { status: 400 }
      );
    }

    const student = await prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
        studentStatus: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { message: "Ученик не найден" },
        { status: 404 }
      );
    }

    const nextStatus =
      parsed.data.status === "ARCHIVED"
        ? StudentAccountStatus.ARCHIVED
        : StudentAccountStatus.ACTIVE;

    const now = new Date();

    const updatedStudent = await prisma.user.update({
      where: {
        id: student.id,
      },
      data:
        nextStatus === StudentAccountStatus.ARCHIVED
          ? {
              studentStatus: StudentAccountStatus.ARCHIVED,
              archivedAt: now,
              sessionVersion: {
                increment: 1,
              },
            }
          : {
              studentStatus: StudentAccountStatus.ACTIVE,
              archivedAt: null,
              frozenAt: null,
              webinarAccessUntil: null,
              sessionVersion: {
                increment: 1,
              },
            },
      select: {
        id: true,
        studentStatus: true,
        archivedAt: true,
      },
    });

    return NextResponse.json({
      student: updatedStudent,
    });
  } catch (error) {
    console.error("[TEACHER_STUDENT_STATUS_PATCH]", error);

    return NextResponse.json(
      { message: "Не удалось изменить статус ученика" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = deleteStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Введите корректный логин ученика" },
        { status: 400 }
      );
    }

    const student = await prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
        email: true,
        studentStatus: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { message: "Ученик не найден" },
        { status: 404 }
      );
    }

    if (student.studentStatus !== StudentAccountStatus.ARCHIVED) {
      return NextResponse.json(
        {
          message:
            "Перед полным удалением ученика необходимо перенести в архив",
        },
        { status: 409 }
      );
    }

    if (
      parsed.data.confirmationEmail.trim().toLowerCase() !==
      student.email.toLowerCase()
    ) {
      return NextResponse.json(
        { message: "Введённый логин не совпадает с логином ученика" },
        { status: 400 }
      );
    }

    /*
     * HomeworkAssignment и Attempt связаны с User через onDelete: Cascade.
     * Ответы попыток удалятся каскадно вместе с Attempt.
     */
    await prisma.user.delete({
      where: {
        id: student.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[TEACHER_STUDENT_DELETE]", error);

    return NextResponse.json(
      { message: "Не удалось удалить ученика" },
      { status: 500 }
    );
  }
}
