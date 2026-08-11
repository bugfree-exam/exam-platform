import assert from "node:assert/strict";
import test from "node:test";

import { analyzeStudentLearning } from "./analytics";
import { generateValidatedStudyPlan } from "./generateStudyPlan";
import { MockStudyPlanProvider } from "./providers/mock";
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
