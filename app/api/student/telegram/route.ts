import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  buildTelegramDeepLink,
  createTelegramLinkToken,
  getTelegramConfig,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiRole(UserRole.STUDENT);

  if (!auth.ok) {
    return auth.response;
  }

  const config = getTelegramConfig();
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      telegramChatId: true,
      telegramUsername: true,
      telegramLinkedAt: true,
      telegramNotificationsEnabled: true,
    },
  });

  return NextResponse.json({
    available: config.configured,
    linked: Boolean(user?.telegramChatId),
    username: user?.telegramUsername ?? null,
    linkedAt: user?.telegramLinkedAt ?? null,
    notificationsEnabled: user?.telegramNotificationsEnabled ?? false,
  });
}

export async function POST() {
  const auth = await requireApiRole(UserRole.STUDENT);

  if (!auth.ok) {
    return auth.response;
  }

  const config = getTelegramConfig();

  if (!config.configured) {
    return NextResponse.json(
      { message: "Telegram-напоминания пока не настроены преподавателем" },
      { status: 503 }
    );
  }

  const { token, hash } = createTelegramLinkToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      telegramLinkTokenHash: hash,
      telegramLinkTokenExpiresAt: expiresAt,
    },
  });

  return NextResponse.json({
    deepLink: buildTelegramDeepLink(token),
    expiresAt,
  });
}

export async function DELETE() {
  const auth = await requireApiRole(UserRole.STUDENT);

  if (!auth.ok) {
    return auth.response;
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      telegramChatId: null,
      telegramUsername: null,
      telegramLinkedAt: null,
      telegramNotificationsEnabled: false,
      telegramLinkTokenHash: null,
      telegramLinkTokenExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
