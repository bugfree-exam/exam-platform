import "server-only";

import { createHash, randomBytes } from "node:crypto";

function readTelegramEnv() {
  return {
    enabled: process.env.TELEGRAM_ENABLED === "true",
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    botUsername: process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "",
    cronSecret: process.env.REMINDER_CRON_SECRET?.trim() || "",
  };
}

export function getTelegramConfig() {
  const config = readTelegramEnv();

  if (!config.enabled) {
    return { ...config, configured: false as const };
  }

  const configured = Boolean(
    config.botToken &&
      config.botUsername &&
      config.webhookSecret &&
      config.cronSecret
  );

  return { ...config, configured };
}

export function createTelegramLinkToken() {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    hash: hashTelegramLinkToken(token),
  };
}

export function hashTelegramLinkToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildTelegramDeepLink(token: string) {
  const config = getTelegramConfig();

  if (!config.configured) {
    throw new Error("Telegram integration is not configured");
  }

  return `https://t.me/${config.botUsername}?start=${encodeURIComponent(token)}`;
}

export async function sendTelegramMessage({
  chatId,
  text,
  disableWebPagePreview = true,
}: {
  chatId: string;
  text: string;
  disableWebPagePreview?: boolean;
}) {
  const config = getTelegramConfig();

  if (!config.configured) {
    throw new Error("Telegram integration is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: disableWebPagePreview,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Telegram sendMessage failed (${response.status}): ${body.slice(0, 300)}`
    );
  }
}
