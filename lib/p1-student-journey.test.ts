import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoscowDayRange,
  hasSkillDependencyCycle,
  parseEgeNumbers,
  validateCourseDates,
  validateDiagnosticLevels,
  validateModuleDates,
} from "./coursePolicy";
import { EGE_SKILL_MAP } from "./egeSkillMap";

test("Today uses the exact Moscow calendar day", () => {
  const { start, end } = getMoscowDayRange(new Date("2026-08-14T21:30:00.000Z"));
  assert.equal(start.toISOString(), "2026-08-14T21:00:00.000Z");
  assert.equal(end.toISOString(), "2026-08-15T21:00:00.000Z");
});

test("teacher sequence keeps valid EGE numbers in the entered order", () => {
  assert.deepEqual(parseEgeNumbers("2, 5, 2; 8 27 30 text"), [2, 5, 8, 27]);
});

test("shared diagnostic must contain both foundation and advanced evidence", () => {
  assert.equal(validateDiagnosticLevels(["FOUNDATION", "BASIC", "ADVANCED"]).isMultilevel, true);
  assert.equal(validateDiagnosticLevels(["FOUNDATION", "BASIC"]).isMultilevel, false);
  assert.equal(validateDiagnosticLevels(["BASIC", "EXAM"]).isMultilevel, false);
});

test("course and module dates cannot silently escape the authored calendar", () => {
  assert.throws(
    () => validateCourseDates(new Date("2026-09-01"), new Date("2026-08-31")),
    /окончания курса/,
  );
  assert.throws(
    () => validateModuleDates(
      new Date("2026-09-01"),
      new Date("2027-06-19"),
      new Date("2026-08-20"),
      new Date("2026-09-10"),
    ),
    /внутри дат/,
  );
});

test("teacher-authored skill dependencies cannot contain a cycle", () => {
  assert.equal(hasSkillDependencyCycle([
    { egeNumber: 1, prerequisiteNumbers: [] },
    { egeNumber: 7, prerequisiteNumbers: [1] },
    { egeNumber: 11, prerequisiteNumbers: [1, 7] },
  ]), false);
  assert.equal(hasSkillDependencyCycle([
    { egeNumber: 1, prerequisiteNumbers: [11] },
    { egeNumber: 7, prerequisiteNumbers: [1] },
    { egeNumber: 11, prerequisiteNumbers: [7] },
  ]), true);
});

test("editable starter map covers every EGE number and has valid dependencies", () => {
  assert.deepEqual(
    EGE_SKILL_MAP.map((skill) => skill.egeNumber).sort((a, b) => a - b),
    Array.from({ length: 27 }, (_, index) => index + 1),
  );
  assert.equal(hasSkillDependencyCycle(EGE_SKILL_MAP.map((skill) => ({
    egeNumber: skill.egeNumber,
    prerequisiteNumbers: skill.prerequisites,
  }))), false);
});
