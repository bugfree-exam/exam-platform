import { notFound, redirect } from "next/navigation";

import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getWebinarPracticeUrl } from "@/lib/webinarPractice";

type WebinarPracticePageProps = {
  params: Promise<{
    id: string;
    homeworkId: string;
  }>;
};

export default async function WebinarPracticePage({
  params,
}: WebinarPracticePageProps) {
  const user = await requireStudentPage();
  const { id: webinarId, homeworkId } = await params;
  const practiceUrl = getWebinarPracticeUrl(webinarId, homeworkId);

  const [practiceMaterial, homework] = await Promise.all([
    prisma.webinarMaterial.findFirst({
      where: {
        webinarId,
        url: practiceUrl,
        webinar: {
          status: "PUBLISHED",
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.homework.findFirst({
      where: {
        id: homeworkId,
        status: "ASSIGNED",
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!practiceMaterial || !homework) {
    notFound();
  }

  await prisma.homeworkAssignment.upsert({
    where: {
      homeworkId_studentId: {
        homeworkId,
        studentId: user.id,
      },
    },
    update: {},
    create: {
      homeworkId,
      studentId: user.id,
    },
  });

  redirect(`/student/homeworks/${homeworkId}`);
}
