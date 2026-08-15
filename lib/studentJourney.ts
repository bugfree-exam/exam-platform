import "server-only";

import { getStudentCourseOverview } from "@/lib/course";
import { EGE_SKILL_MAP, getSkillAvailability } from "@/lib/egeSkillMap";
import type { MasteryState } from "@/lib/mastery";
import { prisma } from "@/lib/prisma";
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
