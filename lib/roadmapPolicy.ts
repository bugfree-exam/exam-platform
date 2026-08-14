import { EGE_SKILL_MAP, type EgeSkillNode } from "@/lib/egeSkillMap";
import type { MasteryState } from "@/lib/mastery";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RoadmapMilestoneDraft = {
  order: number;
  weekStart: Date;
  title: string;
  description: string;
  egeNumbers: number[];
  prerequisiteNumbers: number[];
  plannedMinutes: number;
  reason: string;
};

function startOfWeek(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date;
}

function skillPriority(skill: EgeSkillNode, mastery?: MasteryState) {
  const masteryPriority: Record<MasteryState, number> = {
    CRITICAL_GAP: 0,
    PRACTICE: 1,
    INSUFFICIENT_DATA: 2,
    CONSOLIDATE: 3,
    MASTERED: 4,
  };
  const stagePriority = { FOUNDATION: 0, CORE: 1, ADVANCED: 2, EXAM: 3 };
  return (stagePriority[skill.stage] * 10) + masteryPriority[mastery ?? "INSUFFICIENT_DATA"];
}

export function buildRoadmapMilestones(input: {
  now: Date;
  examDate: Date;
  weeklyMinutes: number;
  targetScore: number;
  masteryByNumber: Map<number, MasteryState>;
}): RoadmapMilestoneDraft[] {
  const firstWeek = startOfWeek(input.now);
  const weeksUntilExam = Math.max(
    1,
    Math.ceil((input.examDate.getTime() - firstWeek.getTime()) / (7 * DAY_MS)),
  );
  const reserveWeeks = weeksUntilExam >= 8 ? 2 : 1;
  const learningWeeks = Math.max(1, weeksUntilExam - reserveWeeks);
  const activeSkills = EGE_SKILL_MAP
    .filter((skill) => input.masteryByNumber.get(skill.egeNumber) !== "MASTERED")
    .sort((first, second) => {
      const priority =
        skillPriority(first, input.masteryByNumber.get(first.egeNumber)) -
        skillPriority(second, input.masteryByNumber.get(second.egeNumber));
      return priority || first.egeNumber - second.egeNumber;
    });

  const buckets: EgeSkillNode[][] = Array.from(
    { length: Math.min(learningWeeks, Math.max(1, activeSkills.length)) },
    () => [],
  );
  const bucketMinutes = buckets.map(() => 0);
  const unplacedSkills: EgeSkillNode[] = [];

  for (const skill of activeSkills) {
    const prerequisiteBucket = skill.prerequisites.reduce((latest, prerequisite) => {
      const index = buckets.findIndex((bucket) =>
        bucket.some((item) => item.egeNumber === prerequisite),
      );
      return Math.max(latest, index);
    }, -1);
    let target = Math.min(prerequisiteBucket + 1, buckets.length - 1);
    while (
      target < buckets.length - 1 &&
      buckets[target].length > 0 &&
      bucketMinutes[target] + skill.estimatedMinutes > input.weeklyMinutes
    ) {
      target += 1;
    }
    if (
      target === buckets.length - 1 &&
      buckets[target].length > 0 &&
      bucketMinutes[target] + skill.estimatedMinutes > input.weeklyMinutes
    ) {
      unplacedSkills.push(skill);
      continue;
    }
    buckets[target].push(skill);
    bucketMinutes[target] += skill.estimatedMinutes;
  }

  const milestones = buckets
    .map((skills, index) => ({ skills, index }))
    .filter((bucket) => bucket.skills.length > 0)
    .map(({ skills, index }, resultIndex) => {
      const weekStart = new Date(firstWeek.getTime() + index * 7 * DAY_MS);
      const weakSkills = skills.filter((skill) => {
        const state = input.masteryByNumber.get(skill.egeNumber);
        return state === "CRITICAL_GAP" || state === "PRACTICE";
      });
      const egeNumbers = skills.map((skill) => skill.egeNumber);
      const prerequisiteNumbers = Array.from(
        new Set(skills.flatMap((skill) => skill.prerequisites)),
      );
      return {
        order: resultIndex + 1,
        weekStart,
        title: `${weakSkills.length ? "Закрыть пробелы" : "Освоить блок"}: ${skills.map((skill) => `№${skill.egeNumber}`).join(", ")}`,
        description: skills.map((skill) => skill.shortTitle).join(" · "),
        egeNumbers,
        prerequisiteNumbers,
        plannedMinutes: Math.min(
          input.weeklyMinutes,
          skills.reduce((sum, skill) => sum + skill.estimatedMinutes, 0),
        ),
        reason: weakSkills.length
          ? "Диагностика или независимые попытки показали, что этот блок требует первоочередной практики."
          : "Блок открыт по карте зависимостей и ведёт к следующим темам экзамена.",
      };
    });

  if (unplacedSkills.length > 0) {
    milestones.push({
      order: milestones.length + 1,
      weekStart: firstWeek,
      title: "Нужно пересогласовать цель или ресурс",
      description: `До экзамена не помещаются блоки: ${unplacedSkills.map((skill) => `№${skill.egeNumber}`).join(", ")}`,
      egeNumbers: unplacedSkills.map((skill) => skill.egeNumber),
      prerequisiteNumbers: Array.from(
        new Set(unplacedSkills.flatMap((skill) => skill.prerequisites)),
      ),
      plannedMinutes: unplacedSkills.reduce(
        (sum, skill) => sum + skill.estimatedMinutes,
        0,
      ),
      reason: "Текущего недельного ресурса недостаточно, чтобы честно обещать весь объём до экзамена. Увеличьте доступное время, измените цель или обсудите приоритеты с учителем.",
    });
  }

  if (weeksUntilExam > 1) {
    const reserveStart = new Date(
      firstWeek.getTime() + Math.max(0, weeksUntilExam - reserveWeeks) * 7 * DAY_MS,
    );
    milestones.push({
      order: milestones.length + 1,
      weekStart: reserveStart,
      title: "Экзаменационная сборка",
      description: "Полные варианты, анализ времени и точечная коррекция ошибок",
      egeNumbers: [],
      prerequisiteNumbers: [],
      plannedMinutes: input.weeklyMinutes,
      reason: `Финишный резерв для выхода на цель ${input.targetScore}+ без изучения больших новых тем в последние дни.`,
    });
  }

  return milestones;
}

export function selectRecoveryQueue<T extends { priority: number; estimatedMinutes?: number }>(
  items: T[],
  weeklyMinutes: number,
) {
  const dailyBudget = Math.max(15, Math.round(weeklyMinutes / 5));
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const selected: T[] = [];
  let used = 0;
  for (const item of sorted) {
    const duration = item.estimatedMinutes ?? 20;
    if (selected.length > 0 && used + duration > dailyBudget) continue;
    selected.push(item);
    used += duration;
    if (selected.length >= 2) break;
  }
  return selected;
}
