"use client";

export function LogoutButton() {
  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось выйти из аккаунта");
      }

      /*
       * Для logout делаем полную перезагрузку страницы.
       * Это очищает клиентское состояние и заново проверяет сессию.
       */
      window.location.replace("/login");
    } catch (error) {
      console.error("[LOGOUT]", error);
      alert("Не удалось выйти из аккаунта");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      Выйти
    </button>
  );
}
