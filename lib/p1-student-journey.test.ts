import assert from "node:assert/strict";
import test from "node:test";

import { buildRoadmapMilestones, selectRecoveryQueue } from "./roadmapPolicy";

test("global route puts prerequisites before dependent skills", () => {
  const milestones = buildRoadmapMilestones({
    now: new Date("2026-08-10T00:00:00.000Z"),
    examDate: new Date("2027-06-19T00:00:00.000Z"),
    weeklyMinutes: 300,
    targetScore: 90,
    masteryByNumber: new Map(),
  });
  const weekByNumber = new Map<number, number>();
  milestones.forEach((milestone, index) => {
    milestone.egeNumbers.forEach((egeNumber) => weekByNumber.set(egeNumber, index));
  });

  assert.ok((weekByNumber.get(5) ?? -1) < (weekByNumber.get(6) ?? -1));
  assert.ok((weekByNumber.get(19) ?? -1) < (weekByNumber.get(20) ?? -1));
  assert.ok((weekByNumber.get(26) ?? -1) < (weekByNumber.get(27) ?? -1));
});

test("global route reserves the final phase for exam assembly", () => {
  const milestones = buildRoadmapMilestones({
    now: new Date("2026-08-10T00:00:00.000Z"),
    examDate: new Date("2027-06-19T00:00:00.000Z"),
    weeklyMinutes: 360,
    targetScore: 85,
    masteryByNumber: new Map(),
  });

  assert.equal(milestones.at(-1)?.title, "Экзаменационная сборка");
  assert.deepEqual(milestones.at(-1)?.egeNumbers, []);
});

test("recovery mode shows at most two short, highest-priority actions", () => {
  const selected = selectRecoveryQueue(
    [
      { id: "routine", priority: 10, estimatedMinutes: 20 },
      { id: "deadline", priority: 100, estimatedMinutes: 20 },
      { id: "error", priority: 60, estimatedMinutes: 15 },
    ],
    180,
  );

  assert.deepEqual(selected.map((item) => item.id), ["deadline", "error"]);
  assert.ok(selected.length <= 2);
  assert.ok(selected.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 36);
});

test("route reports an impossible resource instead of hiding overload", () => {
  const milestones = buildRoadmapMilestones({
    now: new Date("2027-05-31T00:00:00.000Z"),
    examDate: new Date("2027-06-19T00:00:00.000Z"),
    weeklyMinutes: 120,
    targetScore: 100,
    masteryByNumber: new Map(),
  });

  const gap = milestones.find((milestone) => milestone.title.includes("пересогласовать"));
  assert.ok(gap);
  assert.ok(gap.egeNumbers.length > 0);
  assert.ok(gap.plannedMinutes > 120);
});
