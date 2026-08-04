import { z } from "zod";

export const webinarScheduleSchema = z.object({
  topic: z.string().trim().min(1, "Укажите тему").max(200),
  announcement: z.string().trim().max(1500).optional().nullable(),
  joinUrl: z
    .string()
    .trim()
    .url("Укажите корректную ссылку")
    .max(1000)
    .refine(
      (value) => value.startsWith("https://") || value.startsWith("http://"),
      "Ссылка должна начинаться с http:// или https://"
    ),
  eventDate: z.string(),
  eventTime: z.string(),
  isPublished: z.boolean().default(true),
});
