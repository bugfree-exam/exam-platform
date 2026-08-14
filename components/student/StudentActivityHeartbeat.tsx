"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000;
const SESSION_KEY = "exam-platform:activity-session-id";

function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function StudentActivityHeartbeat() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function sendHeartbeat() {
      if (cancelled || document.visibilityState !== "visible") return;

      const sessionId = sessionIdRef.current ?? getSessionId();
      sessionIdRef.current = sessionId;

      try {
        await fetch("/api/student/activity/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, path: pathname }),
          keepalive: true,
        });
      } catch {
        // Телеметрия не должна мешать работе платформы при сетевой ошибке.
      }
    }

    void sendHeartbeat();

    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
