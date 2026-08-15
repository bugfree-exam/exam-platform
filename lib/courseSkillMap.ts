import "server-only";

import type { Prisma } from "@prisma/client";

import { DEFAULT_SKILL_LEVELS, EGE_SKILL_MAP } from "@/lib/egeSkillMap";

export async function createDefaultCourseSkillMap(
  tx: Prisma.TransactionClient,
  courseId: string,
) {
  const existingLevels = await tx.courseSkillLevel.count({ where: { courseId } });
  if (existingLevels > 0) return;

  const levelIds = new Map<string, string>();
  for (const [index, level] of DEFAULT_SKILL_LEVELS.entries()) {
    const created = await tx.courseSkillLevel.create({
      data: {
        courseId,
        order: index + 1,
        title: level.title,
        description: level.description,
      },
    });
    levelIds.set(level.key, created.id);
  }

  const nodeIds = new Map<number, string>();
  for (const level of DEFAULT_SKILL_LEVELS) {
    const skills = EGE_SKILL_MAP.filter((skill) => skill.stage === level.key);
    for (const [index, skill] of skills.entries()) {
      const created = await tx.courseSkillNode.create({
        data: {
          courseId,
          levelId: levelIds.get(level.key)!,
          order: index + 1,
          egeNumber: skill.egeNumber,
          title: skill.title,
          estimatedMinutes: skill.estimatedMinutes,
        },
      });
      nodeIds.set(skill.egeNumber, created.id);
    }
  }

  const dependencies = EGE_SKILL_MAP.flatMap((skill) =>
    skill.prerequisites.map((prerequisiteNumber) => ({
      nodeId: nodeIds.get(skill.egeNumber)!,
      prerequisiteId: nodeIds.get(prerequisiteNumber)!,
    })),
  );
  if (dependencies.length > 0) {
    await tx.courseSkillDependency.createMany({ data: dependencies });
  }
}
