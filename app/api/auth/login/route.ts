import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/session";
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/sessionCookie";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email("Некорректная почта"),
  password: z.string().min(1, "Введите пароль"),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Некорректные данные для входа",
        },
        {
          status: 400,
        }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    /*
     * Для отсутствующего пользователя и неверного пароля возвращаем
     * одинаковое сообщение, чтобы не раскрывать наличие аккаунта.
     */
    if (!user) {
      return NextResponse.json(
        {
          message: "Неверная почта или пароль",
        },
        {
          status: 401,
        }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      parsed.data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          message: "Неверная почта или пароль",
        },
        {
          status: 401,
        }
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

    /*
     * Все параметры cookie находятся в одном месте:
     * lib/sessionCookie.ts.
     *
     * Там задаются httpOnly, secure, sameSite, path,
     * maxAge и priority.
     */
    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("[AUTH_LOGIN]", error);

    return NextResponse.json(
      {
        message: "Ошибка сервера при входе",
      },
      {
        status: 500,
      }
    );
  }
}