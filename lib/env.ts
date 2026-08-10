import "server-only";

import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
);

const optionalString = (min: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(min).optional()
  );

const envSchema = z
  .object({
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
    UPLOAD_DIR: z.string().min(1).default("./public/uploads"),

    ONBOARDING_VIDEO_URL: optionalUrl,

    TELEGRAM_BOT_TOKEN: optionalString(20),
    TELEGRAM_BOT_USERNAME: optionalString(1),
    TELEGRAM_WEBHOOK_SECRET: optionalString(24),
    REMINDER_CRON_SECRET: optionalString(32),
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

    const telegramValues = [
      value.TELEGRAM_BOT_TOKEN,
      value.TELEGRAM_BOT_USERNAME,
      value.TELEGRAM_WEBHOOK_SECRET,
      value.REMINDER_CRON_SECRET,
    ];
    const telegramConfigured = telegramValues.filter(Boolean).length;

    if (telegramConfigured > 0 && telegramConfigured < telegramValues.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TELEGRAM_BOT_TOKEN"],
        message:
          "Для Telegram нужно задать TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET и REMINDER_CRON_SECRET одновременно",
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
