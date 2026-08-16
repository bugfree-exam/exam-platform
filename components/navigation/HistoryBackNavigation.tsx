"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HistoryBackNavigation() {
  const router = useRouter();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const label = anchor.textContent?.trim() ?? "";
      if (!label.startsWith("←")) return;

      const fallback = new URL(anchor.href, window.location.href);
      if (fallback.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      const isSamePageNavigation =
        fallback.pathname === current.pathname &&
        (fallback.search !== current.search || fallback.hash !== current.hash);
      if (isSamePageNavigation) return;

      event.preventDefault();
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(`${fallback.pathname}${fallback.search}${fallback.hash}`);
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  return null;
}
