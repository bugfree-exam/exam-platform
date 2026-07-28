import { cookies } from "next/headers";
import { StudentAccountStatus } from "@prisma/client";

import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const session = await verifySessionToken(token);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentStatus: true,
      sessionVersion: true,
    },
  });

  if (
    !user ||
    user.role !== session.role ||
    user.sessionVersion !== session.sessionVersion ||
    (user.role === "STUDENT" &&
      user.studentStatus === StudentAccountStatus.ARCHIVED)
  ) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
