import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, createSessionToken } from "@/lib/session";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email("Некорректная почта"),
  password: z.string().min(1, "Введите пароль"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Некорректные данные для входа" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Неверная почта или пароль" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      parsed.data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Неверная почта или пароль" },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({
      user: sessionUser,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN]", error);

    return NextResponse.json(
      { message: "Ошибка сервера при входе" },
      { status: 500 }
    );
  }
}