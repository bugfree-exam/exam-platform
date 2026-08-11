import { z } from "zod";

import type { StudentLearningAnalytics } from "./types";

const topicLearningAnalyticsSchema = z
  .object({
    egeNumber: z.number().int().min(1).max(27),
    totalAttempts: z.number().int().nonnegative(),
    correctAttempts: z.number().int().nonnegative(),
    accuracy: z.number().min(0).max(100),
    recentAttempts: z.number().int().nonnegative(),
    recentAccuracy: z.number().min(0).max(100).nullable(),
    previousAttempts: z.number().int().nonnegative(),
    previousAccuracy: z.number().min(0).max(100).nullable(),
    trend: z.number().min(-100).max(100).nullable(),
    currentErrorStreak: z.number().int().nonnegative(),
    category: z.enum([
      "INSUFFICIENT_DATA",
      "CRITICAL_GAP",
      "PRACTICE",
      "CONSOLIDATE",
      "MASTERED",
    ]),
  })
  .strict();

export const studentLearningAnalyticsSchema = z
  .object({
    totalAnswers: z.number().int().nonnegative(),
    overallAccuracy: z.number().min(0).max(100),
    sources: z
      .object({
        HOMEWORK: z.number().int().nonnegative(),
        PRACTICE: z.number().int().nonnegative(),
        VARIANT: z.number().int().nonnegative(),
      })
      .strict(),
    topics: z.array(topicLearningAnalyticsSchema).max(27),
    variants: z
      .object({
        attempts: z.number().int().nonnegative(),
        latestPrimaryScore: z.number().int().nonnegative().nullable(),
        latestTestScore: z.number().min(0).max(100).nullable(),
        recentTestScores: z.array(z.number().min(0).max(100)).max(100),
        trend: z.enum([
          "IMPROVING",
          "DECLINING",
          "STABLE",
          "INSUFFICIENT_DATA",
        ]),
        trendDelta: z.number().nullable(),
      })
      .strict(),
  })
  .strict();

export function parseStudentLearningAnalytics(
  candidate: unknown
): StudentLearningAnalytics {
  return studentLearningAnalyticsSchema.parse(candidate);
}
