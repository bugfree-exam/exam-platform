import "server-only";

import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z
  .object({
    /*
     * Не используем NODE_ENV как признак реального VPS:
     * next build всегда работает в production-режиме.
     */
    APP_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    APP_URL: z.string().url("APP_URL должен быть корректным URL"),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL не задан")
      .refine(
        (value) =>
          value.startsWith("postgresql://") ||
          value.startsWith("postgres://"),
        "DATABASE_URL должен быть PostgreSQL-подключением"
      ),

    /*
     * openssl rand -base64 48 даст секрет достаточной длины.
     */
    JWT_SECRET: z
      .string()
      .min(48, "JWT_SECRET должен содержать минимум 48 символов"),

    SESSION_COOKIE_NAME: z
      .string()
      .min(1)
      .default("exam_without_bugs_session"),

    SESSION_TTL_DAYS: z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .default(14),

    COOKIE_SECURE: booleanFromString,

    /*
     * Локально это public/uploads.
     * На VPS позже укажем постоянную директорию.
     */
    UPLOAD_DIR: z.string().min(1).default("./public/uploads"),
  })
  .superRefine((value, context) => {
    if (
      value.APP_ENV === "production" &&
      !value.APP_URL.startsWith("https://")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_URL"],
        message: "В production APP_URL должен начинаться с https://",
      });
    }

    if (value.APP_ENV === "production" && !value.COOKIE_SECURE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: "В production COOKIE_SECURE должен быть true",
      });
    }

    if (value.COOKIE_SECURE && !value.APP_URL.startsWith("https://")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message:
          "COOKIE_SECURE=true можно использовать только вместе с HTTPS",
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.flatten().fieldErrors;

  console.error("[ENV_VALIDATION_ERROR]", errors);

  throw new Error(
    [
      "Приложение не запущено из-за некорректных переменных окружения.",
      ...Object.entries(errors).flatMap(([key, messages]) =>
        (messages ?? []).map((message) => `${key}: ${message}`)
      ),
    ].join("\n")
  );
}

export const env = parsedEnv.data;