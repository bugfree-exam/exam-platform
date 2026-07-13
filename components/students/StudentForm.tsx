"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function generatePassword() {
  const number = Math.floor(1000 + Math.random() * 9000);
  return `student${number}`;
}

export function StudentForm() {
  const router = useRouter();

  const defaultPassword = useMemo(() => generatePassword(), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(defaultPassword);

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось создать ученика");
        return;
      }

      router.push(`/teacher/students/${data.student.id}`);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyAccess() {
    const text = `Доступ к платформе "Экзамен без багов"\n\nСсылка: http://localhost:3000/login\nЛогин: ${email}\nПароль: ${password}`;

    await navigator.clipboard.writeText(text);
    alert("Доступы скопированы");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Имя ученика
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          placeholder="Например: Иван Петров"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Почта для входа
        </label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          placeholder="student@example.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Пароль
        </label>
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          />

          <button
            type="button"
            onClick={() => setPassword(generatePassword())}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Новый
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <div className="font-semibold text-slate-900">
          Доступы для ученика:
        </div>
        <div className="mt-2">
          Логин: <span className="font-mono">{email || "—"}</span>
        </div>
        <div>
          Пароль: <span className="font-mono">{password}</span>
        </div>

        <button
          type="button"
          onClick={copyAccess}
          disabled={!email}
          className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Скопировать доступы
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Создаём..." : "Создать ученика"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Назад
        </button>
      </div>
    </form>
  );
}