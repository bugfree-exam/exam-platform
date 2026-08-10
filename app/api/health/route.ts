import { constants } from "node:fs";
import { access } from "node:fs/promises";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkWritableStorage(path: string) {
  await access(path, constants.R_OK | constants.W_OK);
}

export async function GET() {
  try {
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      checkWritableStorage(env.UPLOAD_DIR),
      checkWritableStorage(process.env.TASK_FILES_DIR || "./storage/task-files"),
    ]);

    return NextResponse.json(
      {
        status: "ok",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[HEALTH_CHECK]", error);

    return NextResponse.json(
      {
        status: "unavailable",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
