import "server-only";

import { getStudentCourseOverview, getStudentCourseSkillMap } from "@/lib/course";
import { getSkillAvailability } from "@/lib/egeSkillMap";
import type { MasteryState } from "@/lib/mastery";
import { prisma } from "@/lib/prisma";
import { getStudentAnalytics } from "@/lib/studentAnalytics";

export async function getStudentSkillMap(studentId: string) {
  const [analytics, course] = await Promise.all([
    getStudentAnalytics(studentId, "all"),
    getStudentCourseSkillMap(studentId),
  ]);
  const statsByNumber = new Map(
    analytics.skills.map((skill) => [skill.egeNumber, skill]),
  );
  const masteryByNumber = new Map<number, MasteryState>(
    analytics.skills.map((skill) => [skill.egeNumber, skill.status]),
  );

  return {
    courseTitle: course?.title ?? null,
    levels: (course?.skillLevels ?? []).map((level) => ({
      id: level.id,
      order: level.order,
      title: level.title,
      description: level.description,
      skills: level.nodes.map((node) => {
        const prerequisites = node.prerequisiteLinks.map(
          (link) => link.prerequisite.egeNumber,
        );
        return {
          id: node.id,
          order: node.order,
          egeNumber: node.egeNumber,
          title: node.title,
          description: node.description,
          estimatedMinutes: node.estimatedMinutes,
          prerequisites,
          mastery: masteryByNumber.get(node.egeNumber) ?? "INSUFFICIENT_DATA",
          stats: statsByNumber.get(node.egeNumber) ?? null,
          ...getSkillAvailability({ prerequisites }, masteryByNumber),
        };
      }),
    })),
  };
}

export async function getStudentJourneyOverview(studentId: string) {
  const now = new Date();
  const [profile, recovery, course] = await Promise.all([
    prisma.studentPreparationProfile.findUnique({ where: { studentId } }),
    prisma.studentRecoveryPeriod.findFirst({
      where: { studentId, status: "ACTIVE", endsAt: { gte: now } },
      orderBy: { startedAt: "desc" },
    }),
    getStudentCourseOverview(studentId),
  ]);
  const currentTemplateId =
    course?.enrollments[0]?.diagnosticTemplateId ?? course?.diagnosticTemplates[0]?.id;
  const diagnostic = await prisma.studentDiagnosticAttempt.findFirst({
    where: currentTemplateId ? { studentId, templateId: currentTemplateId } : { studentId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return { profile, diagnostic, recovery, course };
}
