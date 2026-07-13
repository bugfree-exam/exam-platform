import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createStudentSchema = z.object({
  name: z.string().min(1, "Введите имя ученика").max(200),
  email: z.string().email("Некорректная почта"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
});

async function requireTeacher() {
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

  if (user.role !== "TEACHER") {
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

export async function GET() {
  const { response } = await requireTeacher();

  if (response) {
    return response;
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
    const { response } = await requireTeacher();

    if (response) {
      return response;
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