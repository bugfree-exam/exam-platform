"use client";

import { useEffect, useRef } from "react";

export function WebinarViewTracker({ webinarId }: { webinarId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    void fetch(`/api/student/webinars/${webinarId}/view`, {
      method: "POST",
      keepalive: true,
    });
  }, [webinarId]);

  return null;
}
