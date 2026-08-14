import type { AttemptSource, LearningAnswer } from "./types";

export type DemoAnswer = Omit<LearningAnswer, "attemptedAt"> & {
  daysAgo: number;
};

export type AiDemoProfile = {
  key: string;
  name: string;
  email: string;
  description: string;
  answers: DemoAnswer[];
};

function topicSeries(input: {
  egeNumber: number;
  outcomesOldestToNewest: boolean[];
  source?: AttemptSource;
  oldestDaysAgo?: number;
}): DemoAnswer[] {
  const oldestDaysAgo = input.oldestDaysAgo ?? 20;

  return input.outcomesOldestToNewest.map((isCorrect, index) => ({
    egeNumber: input.egeNumber,
    isCorrect,
    source: input.source ?? "PRACTICE",
    daysAgo: Math.max(1, oldestDaysAgo - index),
  }));
}

export const AI_DEMO_EMAIL_SUFFIX = "@ai-demo.local";
export const AI_DEMO_PREFIX = "[AI DEMO]";
export const AI_DEMO_PASSWORD = "ai-demo-2026";

export const AI_DEMO_PROFILES: AiDemoProfile[] = [
  {
    key: "new",
    name: "AI • Новый ученик",
    email: `new${AI_DEMO_EMAIL_SUFFIX}`,
    description: "Нет попыток: система должна предложить сначала накопить статистику.",
    answers: [],
  },
  {
    key: "strong",
    name: "AI • Сильный стабильный",
    email: `strong${AI_DEMO_EMAIL_SUFFIX}`,
    description: "Высокая и стабильная точность по нескольким номерам.",
    answers: [
      ...topicSeries({
        egeNumber: 2,
        outcomesOldestToNewest: [false, true, true, true, true, true, true, true, true, true],
        oldestDaysAgo: 28,
      }),
      ...topicSeries({
        egeNumber: 5,
        outcomesOldestToNewest: [false, true, true, true, true, true, true, true, true, true],
        oldestDaysAgo: 24,
      }),
      ...topicSeries({
        egeNumber: 13,
        outcomesOldestToNewest: [true, true, true, true, true, true, true, true, true, true],
        oldestDaysAgo: 20,
      }),
    ],
  },
  {
    key: "critical",
    name: "AI • Критические пробелы",
    email: `critical${AI_DEMO_EMAIL_SUFFIX}`,
    description: "Низкая точность и длинные серии ошибок по №8 и №13.",
    answers: [
      ...topicSeries({
        egeNumber: 8,
        outcomesOldestToNewest: [false, false, false, false, false, false, false, false, false, false],
      }),
      ...topicSeries({
        egeNumber: 13,
        outcomesOldestToNewest: [true, false, false, true, false, false, false, false, false, false],
        oldestDaysAgo: 18,
      }),
    ],
  },
  {
    key: "declining",
    name: "AI • Недавнее ухудшение",
    email: `declining${AI_DEMO_EMAIL_SUFFIX}`,
    description: "Предыдущие пять решений №5 верны, последние пять — ошибочны.",
    answers: topicSeries({
      egeNumber: 5,
      outcomesOldestToNewest: [true, true, true, true, true, false, false, false, false, false],
    }),
  },
  {
    key: "streak",
    name: "AI • Серия ошибок",
    email: `streak${AI_DEMO_EMAIL_SUFFIX}`,
    description: "После устойчивых результатов появились четыре ошибки подряд по №16.",
    answers: topicSeries({
      egeNumber: 16,
      outcomesOldestToNewest: [true, true, true, true, true, true, false, false, false, false],
    }),
  },
  {
    key: "mixed",
    name: "AI • Смешанная активность",
    email: `mixed${AI_DEMO_EMAIL_SUFFIX}`,
    description: "Попытки из тренажёра, домашних работ и улучшающихся вариантов.",
    answers: topicSeries({
      egeNumber: 2,
      outcomesOldestToNewest: [false, true, true, true],
      oldestDaysAgo: 16,
    }),
  },
];

export function materializeDemoAnswers(
  profile: AiDemoProfile,
  now = new Date()
): LearningAnswer[] {
  return profile.answers.map(({ daysAgo, ...answer }) => ({
    ...answer,
    attemptedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  }));
}
