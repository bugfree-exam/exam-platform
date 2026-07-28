import { randomInt } from "node:crypto";

import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTemporaryPassword(length = 12) {
  return Array.from({ length }, () => {
    const index = randomInt(0, PASSWORD_ALPHABET.length);
    return PASSWORD_ALPHABET[index];
  }).join("");
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiRole(UserRole.TEACHER);

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const student = await prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { message: "Ученик не найден" },
        { status: 404 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await prisma.user.update({
      where: {
        id: student.id,
      },
      data: {
        passwordHash,
        sessionVersion: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      temporaryPassword,
    });
  } catch (error) {
    console.error("[TEACHER_RESET_STUDENT_PASSWORD]", error);

    return NextResponse.json(
      { message: "Не удалось заменить пароль" },
      { status: 500 }
    );
  }
}
