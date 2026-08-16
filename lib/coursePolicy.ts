import type { CourseItemType, DiagnosticTaskLevel } from "@prisma/client";

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const COURSE_ITEM_LABELS: Record<CourseItemType, string> = {
  THEORY: "Теория",
  PRACTICE: "Практика",
  HOMEWORK: "Домашняя работа",
  WEBINAR: "Вебинар",
  VARIANT: "Вариант",
  CONTROL: "Контроль",
  ERROR_REVIEW: "Исправление ошибок",
  OTHER: "Другое",
};

export const MANUAL_COURSE_ITEM_TYPES = [
  "THEORY",
  "PRACTICE",
  "HOMEWORK",
  "VARIANT",
  "CONTROL",
  "ERROR_REVIEW",
  "OTHER",
] as const satisfies readonly CourseItemType[];

export function isManualCourseItemType(type: CourseItemType) {
  return type !== "WEBINAR";
}

export const DIAGNOSTIC_LEVEL_LABELS: Record<DiagnosticTaskLevel, string> = {
  FOUNDATION: "Совсем простое",
  BASIC: "Базовое",
  ADVANCED: "Повышенное",
  EXAM: "Сложное / экзаменационное",
};

export function getMoscowDayRange(now: Date) {
  const moscow = new Date(now.getTime() + MOSCOW_OFFSET_MS);
  const year = moscow.getUTCFullYear();
  const month = moscow.getUTCMonth();
  const day = moscow.getUTCDate();
  const start = new Date(Date.UTC(year, month, day) - MOSCOW_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

export function parseEgeNumbers(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((part) => Number(part))
        .filter((number) => Number.isInteger(number) && number >= 1 && number <= 27),
    ),
  );
}

export function validateCourseDates(startDate: Date, endDate: Date) {
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error("Дата окончания курса должна быть позже даты начала");
  }
}

export function validateModuleDates(
  courseStart: Date,
  courseEnd: Date,
  moduleStart: Date,
  moduleEnd: Date,
) {
  validateCourseDates(moduleStart, moduleEnd);
  if (moduleStart < courseStart || moduleEnd > courseEnd) {
    throw new Error("Модуль должен находиться внутри дат годового курса");
  }
}

export function validateDiagnosticLevels(levels: DiagnosticTaskLevel[]) {
  const unique = new Set(levels);
  return {
    hasFoundation: unique.has("FOUNDATION"),
    hasAdvanced: unique.has("ADVANCED") || unique.has("EXAM"),
    isMultilevel:
      unique.has("FOUNDATION") && (unique.has("ADVANCED") || unique.has("EXAM")),
  };
}

export function hasSkillDependencyCycle(
  nodes: Array<{ egeNumber: number; prerequisiteNumbers: number[] }>,
) {
  const graph = new Map(
    nodes.map((node) => [node.egeNumber, node.prerequisiteNumbers]),
  );
  const visiting = new Set<number>();
  const visited = new Set<number>();

  function visit(egeNumber: number): boolean {
    if (visiting.has(egeNumber)) return true;
    if (visited.has(egeNumber)) return false;

    visiting.add(egeNumber);
    for (const prerequisite of graph.get(egeNumber) ?? []) {
      if (graph.has(prerequisite) && visit(prerequisite)) return true;
    }
    visiting.delete(egeNumber);
    visited.add(egeNumber);
    return false;
  }

  return nodes.some((node) => visit(node.egeNumber));
}
