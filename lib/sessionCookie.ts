import "server-only";

import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME;

export const SESSION_TTL_SECONDS =
  env.SESSION_TTL_DAYS * 24 * 60 * 60;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high" as const,
  };
}