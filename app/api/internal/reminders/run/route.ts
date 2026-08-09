import { NextResponse } from "next/server";

import { processStudentReminders } from "@/lib/reminders";
import { getTelegramConfig } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = getTelegramConfig();

  if (!config.configured) {
    return NextResponse.json(
      { message: "Telegram integration is not configured" },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await processStudentReminders();

  if (result.errors.length > 0) {
    console.error("[REMINDER_RUN_ERRORS]", result.errors);
  }

  return NextResponse.json({
    checked: result.checked,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors.length,
  });
}
