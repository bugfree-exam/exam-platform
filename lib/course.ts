import "server-only";

import { CourseStatus, DiagnosticTemplateStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getStudentCourse(studentId: string) {
  const enrollment = await prisma.studentCourseEnrollment.findFirst({
    where: { studentId, isActive: true, course: { status: CourseStatus.PUBLISHED } },
    orderBy: { joinedAt: "desc" },
    include: { course: true },
  });
  if (enrollment) return enrollment.course;

  return prisma.annualCourse.findFirst({
    where: { status: CourseStatus.PUBLISHED },
    orderBy: [{ startDate: "desc" }, { publishedAt: "desc" }],
  });
}

export async function getStudentCourseOverview(studentId: string) {
  const course = await getStudentCourse(studentId);
  if (!course) return null;

  return prisma.annualCourse.findUnique({
    where: { id: course.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { scheduleItems: { orderBy: [{ scheduledFor: "asc" }, { order: "asc" }] } },
      },
      scheduleItems: { orderBy: [{ scheduledFor: "asc" }, { order: "asc" }] },
      enrollments: {
        where: { studentId, isActive: true },
        take: 1,
        select: { diagnosticTemplateId: true },
      },
      diagnosticTemplates: {
        where: { status: DiagnosticTemplateStatus.PUBLISHED },
        orderBy: { version: "desc" },
        take: 1,
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
}

export async function getPublishedDiagnosticTemplate(studentId: string) {
  const enrollment = await prisma.studentCourseEnrollment.findFirst({
    where: {
      studentId,
      isActive: true,
      diagnosticTemplateId: { not: null },
      course: { status: CourseStatus.PUBLISHED },
    },
    orderBy: { joinedAt: "desc" },
    include: {
      diagnosticTemplate: {
        include: {
          items: {
            orderBy: { order: "asc" },
            include: { taskRevision: true },
          },
        },
      },
    },
  });
  if (enrollment?.diagnosticTemplate) return enrollment.diagnosticTemplate;

  const course = await getStudentCourse(studentId);
  if (!course) return null;

  return prisma.diagnosticTemplate.findFirst({
    where: { courseId: course.id, status: DiagnosticTemplateStatus.PUBLISHED },
    orderBy: { version: "desc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { taskRevision: true },
      },
    },
  });
}

export async function getTeacherCourseWorkspace() {
  return prisma.annualCourse.findFirst({
    where: { status: { in: [CourseStatus.PUBLISHED, CourseStatus.DRAFT] } },
    orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
    include: {
      modules: { orderBy: { order: "asc" } },
      scheduleItems: { orderBy: [{ scheduledFor: "asc" }, { order: "asc" }] },
      diagnosticTemplates: {
        where: { status: { in: [DiagnosticTemplateStatus.PUBLISHED, DiagnosticTemplateStatus.DRAFT] } },
        orderBy: { version: "desc" },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              taskRevision: { select: { egeNumber: true, title: true, version: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
}
