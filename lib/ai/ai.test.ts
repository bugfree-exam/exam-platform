import assert from "node:assert/strict";
import test from "node:test";

import { analyzeStudentLearning } from "./analytics";
import { parseStudentLearningAnalytics } from "./analyticsSchema";
import { AI_DEMO_PROFILES, materializeDemoAnswers } from "./demoProfiles";
import { generateValidatedStudyPlan } from "./generateStudyPlan";
import { generateStudyPlanWithFallback } from "./generateStudyPlanWithFallback";
import { createConfiguredStudyPlanProvider } from "./providers/config";
import { MockStudyPlanProvider } from "./providers/mock";
import { OpenAiCompatibleStudyPlanProvider } from "./providers/openAiCompatible";
import { getNextStudyPlanStatus } from "./studyPlanLifecycle";
import type { LearningAnswer, StudentLearningAnalytics } from "./types";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-08-11T12:00:00.000Z");

function answers(egeNumber: number, correctness: boolean[]): LearningAnswer[] {
  return correctness.map((isCorrect, index) => ({
    egeNumber,
    isCorrect,
    attemptedAt: new Date(now.getTime() - index * day),
    source: "PRACTICE",
  }));
}

test("classifies topics by mastery", () => {
  const analytics = analyzeStudentLearning({
    answers: [
      ...answers(2, [true, true, true, true, true]),
      ...answers(8, [false, false, true, false, false]),
      ...answers(13, [true, false, true, true, false]),
    ],
    variants: [],
  });

  assert.equal(analytics.topics.find((topic) => topic.egeNumber === 2)?.category, "MASTERED");
  assert.equal(analytics.topics.find((topic) => topic.egeNumber === 8)?.category, "CRITICAL_GAP");
  assert.equal(analytics.topics.find((topic) => topic.egeNumber === 13)?.category, "PRACTICE");
});

test("detects a recent regression even when historic accuracy was strong", () => {
  const analytics = analyzeStudentLearning({
    answers: answers(16, [false, false, true, false, true, true, true, true, true, true]),
    variants: [],
  });
  const topic = analytics.topics[0];

  assert.equal(topic.trend, -60);
  assert.equal(topic.category, "CRITICAL_GAP");
});

test("detects a current error streak", () => {
  const analytics = analyzeStudentLearning({
    answers: answers(27, [false, false, false, true, true, true]),
    variants: [],
  });

  assert.equal(analytics.topics[0].currentErrorStreak, 3);
  assert.equal(analytics.topics[0].category, "CRITICAL_GAP");
});

test("calculates variant score dynamics chronologically", () => {
  const analytics = analyzeStudentLearning({
    answers: [],
    variants: [40, 55, 62].map((testScore, index) => ({
      primaryScore: 10 + index,
      testScore,
      submittedAt: new Date(now.getTime() + index * day),
    })),
  });

  assert.equal(analytics.variants.trend, "IMPROVING");
  assert.equal(analytics.variants.trendDelta, 22);
  assert.deepEqual(analytics.variants.recentTestScores, [40, 55, 62]);
});

test("mock provider returns a plan accepted by independent validation", async () => {
  const analytics = analyzeStudentLearning({
    answers: answers(8, [false, false, false, true, false]),
    variants: [],
  });
  const plan = await generateValidatedStudyPlan(new MockStudyPlanProvider(), analytics);

  assert.equal(plan.topics[0].egeNumber, 8);
  assert.ok(plan.actions[0].taskCount > 0);
});

test("rejects unexpected fields and oversized provider output", async () => {
  const emptyAnalytics: StudentLearningAnalytics = analyzeStudentLearning({ answers: [], variants: [] });
  const unsafeProvider = {
    name: "unsafe-test",
    async generatePlan() {
      return {
        title: "Небезопасный план",
        summary: "Проверка строгой схемы",
        durationDays: 1,
        studentEmail: "student@example.com",
        topics: [{ egeNumber: 1, priority: "HIGH", reason: "Тест" }],
        actions: [{ day: 1, egeNumber: 1, taskCount: 101, goal: "Тест" }],
      };
    },
  };

  await assert.rejects(() => generateValidatedStudyPlan(unsafeProvider, emptyAnalytics));
});

test("validates stored analytics and rejects personal data", () => {
  const analytics = analyzeStudentLearning({ answers: [], variants: [] });

  assert.deepEqual(parseStudentLearningAnalytics(analytics), analytics);
  assert.throws(() =>
    parseStudentLearningAnalytics({
      ...analytics,
      studentEmail: "student@example.com",
    })
  );
});

test("allows only safe study plan status transitions", () => {
  assert.equal(getNextStudyPlanStatus("DRAFT", "CONFIRM"), "CONFIRMED");
  assert.equal(getNextStudyPlanStatus("DRAFT", "CANCEL"), "CANCELLED");
  assert.equal(getNextStudyPlanStatus("CONFIRMED", "CANCEL"), "CANCELLED");
  assert.throws(() => getNextStudyPlanStatus("CONFIRMED", "CONFIRM"));
  assert.throws(() => getNextStudyPlanStatus("CANCELLED", "CONFIRM"));
});

test("demo profiles reproduce the intended learning scenarios", () => {
  const analyticsByProfile = new Map(
    AI_DEMO_PROFILES.map((profile) => [
      profile.key,
      analyzeStudentLearning({
        answers: materializeDemoAnswers(profile, now),
        variants: [],
      }),
    ])
  );

  assert.equal(analyticsByProfile.get("new")?.totalAnswers, 0);
  assert.ok(
    analyticsByProfile
      .get("strong")
      ?.topics.every((topic) => topic.category === "MASTERED")
  );
  assert.ok(
    analyticsByProfile
      .get("critical")
      ?.topics.every((topic) => topic.category === "CRITICAL_GAP")
  );
  assert.equal(
    analyticsByProfile.get("declining")?.topics[0]?.trend,
    -100
  );
  assert.equal(
    analyticsByProfile.get("declining")?.topics[0]?.category,
    "CRITICAL_GAP"
  );
  assert.equal(
    analyticsByProfile.get("streak")?.topics[0]?.currentErrorStreak,
    4
  );
});

test("uses mock by default and requires complete external provider settings", () => {
  assert.equal(createConfiguredStudyPlanProvider({}).name, "mock");
  assert.throws(() =>
    createConfiguredStudyPlanProvider({
      AI_PROVIDER: "openai-compatible",
      AI_API_BASE_URL: "https://example.com/v1",
    })
  );
});

test("external provider sends only validated anonymized analytics", async () => {
  const analytics = analyzeStudentLearning({
    answers: answers(8, [false, true, false]),
    variants: [],
  });
  const capturedRequests: Record<string, unknown>[] = [];

  const provider = new OpenAiCompatibleStudyPlanProvider({
    apiBaseUrl: "https://provider.example/v1",
    apiKey: "test-secret",
    model: "test-model",
    fetchImpl: async (_input, init) => {
      capturedRequests.push(
        JSON.parse(String(init?.body)) as Record<string, unknown>
      );
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "План по заданию №8",
                  summary: "Безопасный тестовый план",
                  durationDays: 3,
                  topics: [
                    {
                      egeNumber: 8,
                      priority: "HIGH",
                      reason: "Низкая точность",
                    },
                  ],
                  actions: [
                    {
                      day: 1,
                      egeNumber: 8,
                      taskCount: 5,
                      goal: "Отработать алгоритм решения",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
  });

  const plan = await generateValidatedStudyPlan(provider, analytics);
  assert.equal(plan.topics[0].egeNumber, 8);

  const requestBody = capturedRequests[0];
  assert.ok(requestBody);
  const messages = requestBody.messages;
  assert.ok(Array.isArray(messages));
  const userMessage = messages.find(
    (message) =>
      message && typeof message === "object" && message.role === "user"
  );
  assert.ok(userMessage && typeof userMessage.content === "string");
  assert.deepEqual(JSON.parse(userMessage.content), { analytics });

  const serialized = JSON.stringify(requestBody);
  assert.ok(!serialized.includes("studentEmail"));
  assert.ok(!serialized.includes("studentName"));
  assert.ok(!serialized.includes("correctAnswer"));
});

test("falls back to validated mock plan when external provider fails", async () => {
  const analytics = analyzeStudentLearning({
    answers: answers(13, [false, false, true]),
    variants: [],
  });
  const unavailableProvider = {
    name: "openai-compatible:unavailable",
    async generatePlan() {
      throw new Error("Provider unavailable");
    },
  };

  const result = await generateStudyPlanWithFallback(
    unavailableProvider,
    analytics
  );

  assert.equal(result.provider.name, "mock:fallback");
  assert.equal(result.failedPrimary?.provider, unavailableProvider.name);
  assert.equal(result.plan.topics[0].egeNumber, 13);
});
