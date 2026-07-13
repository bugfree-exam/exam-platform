import Link from "next/link";

import { StudentForm } from "@/components/students/StudentForm";

export default function CreateStudentPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link
            href="/teacher/students"
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Ученики
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Добавление ученика
          </h1>

          <p className="mt-2 text-slate-600">
            Создай аккаунт ученика и скопируй доступы для входа.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <StudentForm />
        </section>
      </div>
    </main>
  );
}