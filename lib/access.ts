import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Не авторизован" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function requireApiRole(requiredRole: UserRole) {
  const auth = await requireApiUser();

  if (!auth.ok) {
    return auth;
  }

  if (auth.user.role !== requiredRole) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Недостаточно прав" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    user: auth.user,
  };
}

export async function requireTeacherPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.TEACHER) {
    redirect("/student");
  }

  return user;
}

export async function requireStudentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== UserRole.STUDENT) {
    redirect("/teacher");
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastActivityAt: new Date(),
    },
  });

  return user;
}