import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoscowDayRange,
  parseEgeNumbers,
  validateCourseDates,
  validateDiagnosticLevels,
  validateModuleDates,
} from "./coursePolicy";

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
