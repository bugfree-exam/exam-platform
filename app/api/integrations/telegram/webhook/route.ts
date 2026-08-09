import { StudentAccountStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getTelegramConfig,
  hashTelegramLinkToken,
  sendTelegramMessage,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
      type?: string;
    };
    from?: {
      username?: string;
    };
  };
};

function commandAndArgument(text: string) {
  const [rawCommand = "", argument = ""] = text.trim().split(/\s+/, 2);
  const command = rawCommand.split("@")[0]?.toLowerCase() ?? "";

  return { command, argument };
}

async function reply(chatId: string, text: string) {
  try {
    await sendTelegramMessage({ chatId, text });
  } catch (error) {
    console.error("[TELEGRAM_WEBHOOK_REPLY]", error);
  }
}

export async function POST(request: Request) {
  const config = getTelegramConfig();

  if (!config.configured) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const providedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (!providedSecret || providedSecret !== config.webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as
    | TelegramUpdate
    | null;
  const message = update?.message;
  const text = message?.text?.trim();
  const rawChatId = message?.chat?.id;

  if (!text || rawChatId === undefined || rawChatId === null) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(rawChatId);
  const { command, argument } = commandAndArgument(text);

  if (command === "/stop") {
    await prisma.user.updateMany({
      where: { telegramChatId: chatId },
      data: { telegramNotificationsEnabled: false },
    });

    await reply(
      chatId,
      "Напоминания выключены. Включить их снова можно через страницу Telegram в личном кабинете."
    );

    return NextResponse.json({ ok: true });
  }

  if (command !== "/start") {
    await reply(
      chatId,
      "Я отправляю напоминания о домашних заданиях и вариантах. Для привязки открой страницу Telegram в личном кабинете и нажми «Подключить»."
    );
    return NextResponse.json({ ok: true });
  }

  if (!argument) {
    await reply(
      chatId,
      "Чтобы безопасно привязать Telegram, открой страницу Telegram в личном кабинете платформы и нажми «Подключить»."
    );
    return NextResponse.json({ ok: true });
  }

  const tokenHash = hashTelegramLinkToken(argument);
  const user = await prisma.user.findFirst({
    where: {
      role: UserRole.STUDENT,
      studentStatus: StudentAccountStatus.ACTIVE,
      telegramLinkTokenHash: tokenHash,
      telegramLinkTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true, name: true },
  });

  if (!user) {
    await reply(
      chatId,
      "Ссылка для подключения устарела или уже использована. Создай новую ссылку в личном кабинете."
    );
    return NextResponse.json({ ok: true });
  }

  const alreadyLinked = await prisma.user.findFirst({
    where: {
      telegramChatId: chatId,
      id: { not: user.id },
    },
    select: { id: true },
  });

  if (alreadyLinked) {
    await reply(
      chatId,
      "Этот Telegram уже привязан к другому аккаунту платформы. Сначала отключи его в том аккаунте."
    );
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: chatId,
      telegramUsername: message?.from?.username ?? null,
      telegramLinkedAt: new Date(),
      telegramNotificationsEnabled: true,
      telegramLinkTokenHash: null,
      telegramLinkTokenExpiresAt: null,
    },
  });

  const firstName = user.name.trim().split(/\s+/)[0] || "Готово";
  await reply(
    chatId,
    `${firstName}, Telegram подключён ✅\n\nЯ напомню о несданной работе за сутки до дедлайна и ещё один раз после просрочки. После сдачи напоминания по этой работе прекращаются.`
  );

  return NextResponse.json({ ok: true });
}
