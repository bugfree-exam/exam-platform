import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { requireApiRole } from "@/lib/access";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createStudentSchema = z.object({
  name: z.string().min(1, "Введите имя ученика").max(200),
  email: z.string().email("Некорректная почта"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
});

export async function GET() {
  const auth = await requireApiRole(UserRole.TEACHER);

  if (!auth.ok) {
    return auth.response;
  }

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      assignedHomeworks: {
        select: {
          id: true,
        },
      },
      attempts: {
        where: {
          status: "SUBMITTED",
        },
        select: {
          id: true,
          percent: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные ученика",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Пользователь с такой почтой уже существует" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const student = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        passwordHash,
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error("[STUDENTS_POST]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при создании ученика" },
      { status: 500 }
    );
  }
}