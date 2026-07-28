import {
  StudentAccountStatus,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/session";
import {
  consumeRateLimit,
  getRequestClientKey,
} from "@/lib/rateLimit";
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
    const rateLimit = consumeRateLimit({
      key: `login:${getRequestClientKey(request)}:${email}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message:
            "Слишком много попыток входа. Попробуйте немного позже.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

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
        studentStatus: true,
        sessionVersion: true,
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

    /*
     * Статус проверяем после успешной проверки пароля.
     * Так посторонний человек не сможет выяснить, существует ли аккаунт.
     */
    if (
      user.role === UserRole.STUDENT &&
      user.studentStatus === StudentAccountStatus.ARCHIVED
    ) {
      return NextResponse.json(
        {
          message:
            "Доступ к аккаунту приостановлен. Обратитесь к преподавателю.",
        },
        {
          status: 403,
        }
      );
    }

    if (user.role === UserRole.STUDENT) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastActivityAt: new Date(),
        },
      });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };

    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
      },
    });

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
