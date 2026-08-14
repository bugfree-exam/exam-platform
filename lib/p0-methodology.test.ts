import assert from "node:assert/strict";
import test from "node:test";

import { getMasteryState } from "./mastery";
import {
  canRevealPracticeSolution,
  getPracticeFeedbackStage,
} from "./practiceFeedback";
import { calculateStudyPlanProgress } from "./ai/studyPlanProgress";

test("first wrong answer returns a hint without revealing the solution", () => {
  const stage = getPracticeFeedbackStage({
    isCorrect: false,
    priorAttemptsOnTask: 0,
  });
  assert.equal(stage, "HINT");
  assert.equal(canRevealPracticeSolution(stage), false);
});

test("a correct answer or a second attempt may reveal the solution", () => {
  assert.equal(
    getPracticeFeedbackStage({ isCorrect: true, priorAttemptsOnTask: 0 }),
    "SOLUTION"
  );
  assert.equal(
    getPracticeFeedbackStage({ isCorrect: false, priorAttemptsOnTask: 1 }),
    "SOLUTION"
  );
});

test("all interfaces share one mastery scale", () => {
  assert.equal(getMasteryState(2, 100), "INSUFFICIENT_DATA");
  assert.equal(getMasteryState(3, 39), "CRITICAL_GAP");
  assert.equal(getMasteryState(3, 40), "PRACTICE");
  assert.equal(getMasteryState(3, 65), "CONSOLIDATE");
  assert.equal(getMasteryState(3, 85), "MASTERED");
});

test("familiar repeats do not increase sprint progress", () => {
  const plan = {
    actions: [
      {
        day: 1,
        egeNumber: 5,
        skill: "алгоритм",
        taskCount: 3,
        minimumAccuracy: 80,
        controlDelayDays: 1,
        goal: "Решить новые задачи",
      },
    ],
  };
  const progress = calculateStudyPlanProgress(plan, [
    { studyPlanActionIndex: 0, isCorrect: true, countsForMastery: true },
    { studyPlanActionIndex: 0, isCorrect: true, countsForMastery: false },
    { studyPlanActionIndex: 0, isCorrect: true, countsForMastery: false },
  ]);

  assert.equal(progress.actions[0].attempted, 1);
  assert.equal(progress.actions[0].volumeMet, false);
});
