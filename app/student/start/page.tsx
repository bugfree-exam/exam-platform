import Link from "next/link";

import { PreparationOnboardingForm } from "@/components/student/PreparationOnboardingForm";
import { requireStudentPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentStartPage() {
  const user = await requireStudentPage();
  const profile = await prisma.studentPreparationProfile.findUnique({
    where: { studentId: user.id },
  });

  return (
    <main className="min-h-screen bg-[#f3f7fa] px-4 py-6 text-[#102638] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/student" className="text-sm font-bold text-cyan-700">← В кабинет</Link>
        <header className="mt-4 overflow-hidden rounded-[32px] bg-[#092535] p-7 text-white sm:p-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-300">start.profile</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Зафиксируем вашу цель и ресурс</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Годовой маршрут задаёт преподаватель и он един для курса. Эти ответы нужны, чтобы честно оценивать ваш прогресс, замечать перегрузку и вовремя предлагать восстановление.</p>
        </header>
        <PreparationOnboardingForm
          initial={profile ? {
            targetScore: profile.targetScore,
            examDate: profile.examDate.toISOString().slice(0, 10),
            weeklyMinutes: profile.weeklyMinutes,
            sessionMinutes: profile.sessionMinutes,
            preferredDays: profile.preferredDays as number[],
            currentLevel: profile.currentLevel,
          } : undefined}
        />
      </div>
    </main>
  );
}
