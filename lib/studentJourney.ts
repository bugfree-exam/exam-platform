import "server-only";

import { RoadmapMilestoneStatus, StudentRoadmapStatus } from "@prisma/client";

import { EGE_SKILL_MAP, getSkillAvailability } from "@/lib/egeSkillMap";
import type { MasteryState } from "@/lib/mastery";
import { prisma } from "@/lib/prisma";
import { buildRoadmapMilestones } from "@/lib/roadmapPolicy";
import { getStudentAnalytics } from "@/lib/studentAnalytics";

export async function getStudentSkillMap(studentId: string) {
  const analytics = await getStudentAnalytics(studentId, "all");
  const statsByNumber = new Map(
    analytics.skills.map((skill) => [skill.egeNumber, skill]),
  );
  const masteryByNumber = new Map<number, MasteryState>(
    analytics.skills.map((skill) => [skill.egeNumber, skill.status]),
  );

  return EGE_SKILL_MAP.map((node) => ({
    ...node,
    mastery: masteryByNumber.get(node.egeNumber) ?? "INSUFFICIENT_DATA",
    stats: statsByNumber.get(node.egeNumber) ?? null,
    ...getSkillAvailability(node, masteryByNumber),
  }));
}

export async function generateStudentRoadmap(
  studentId: string,
  sourceDiagnosticId?: string,
) {
  const [profile, analytics] = await Promise.all([
    prisma.studentPreparationProfile.findUnique({ where: { studentId } }),
    getStudentAnalytics(studentId, "all"),
  ]);
  if (!profile) throw new Error("Сначала завершите стартовый онбординг");

  const masteryByNumber = new Map<number, MasteryState>(
    analytics.skills.map((skill) => [skill.egeNumber, skill.status]),
  );
  const drafts = buildRoadmapMilestones({
    now: new Date(),
    examDate: profile.examDate,
    weeklyMinutes: profile.weeklyMinutes,
    targetScore: profile.targetScore,
    masteryByNumber,
  });
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.studentRoadmap.updateMany({
      where: { studentId, status: StudentRoadmapStatus.ACTIVE },
      data: { status: StudentRoadmapStatus.ARCHIVED },
    });

    return tx.studentRoadmap.create({
      data: {
        studentId,
        sourceDiagnosticId,
        targetScore: profile.targetScore,
        examDate: profile.examDate,
        weeklyMinutes: profile.weeklyMinutes,
        milestones: {
          create: drafts.map((draft, index) => ({
            order: draft.order,
            weekStart: draft.weekStart,
            title: draft.title,
            description: draft.description,
            egeNumbers: draft.egeNumbers,
            prerequisiteNumbers: draft.prerequisiteNumbers,
            plannedMinutes: draft.plannedMinutes,
            reason: draft.reason,
            status:
              index === 0 || draft.weekStart <= now
                ? RoadmapMilestoneStatus.ACTIVE
                : RoadmapMilestoneStatus.PLANNED,
          })),
        },
      },
      include: { milestones: { orderBy: { order: "asc" } } },
    });
  });
}

export async function getStudentJourneyOverview(studentId: string) {
  const now = new Date();
  const [profile, diagnostic, roadmap, recovery] = await Promise.all([
    prisma.studentPreparationProfile.findUnique({ where: { studentId } }),
    prisma.studentDiagnosticAttempt.findFirst({
      where: { studentId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        score: true,
        maxScore: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    prisma.studentRoadmap.findFirst({
      where: { studentId, status: StudentRoadmapStatus.ACTIVE },
      orderBy: { generatedAt: "desc" },
      include: { milestones: { orderBy: { order: "asc" } } },
    }),
    prisma.studentRecoveryPeriod.findFirst({
      where: { studentId, status: "ACTIVE", endsAt: { gte: now } },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  if (roadmap?.milestones.length) {
    const activeIndex = roadmap.milestones.reduce(
      (latest, milestone, index) => (milestone.weekStart <= now ? index : latest),
      0,
    );
    roadmap.milestones = roadmap.milestones.map((milestone, index) => ({
      ...milestone,
      status:
        index === activeIndex
          ? RoadmapMilestoneStatus.ACTIVE
          : milestone.status === RoadmapMilestoneStatus.ACTIVE
            ? RoadmapMilestoneStatus.PLANNED
            : milestone.status,
    }));
  }

  return { profile, diagnostic, roadmap, recovery };
}
