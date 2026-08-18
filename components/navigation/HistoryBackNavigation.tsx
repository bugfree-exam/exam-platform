"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function HistoryBackNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  // history.length includes entries that do not belong to this app (for
  // example, the opener of a new tab). Track only client-side app navigation
  // so a copied deep link always uses its explicit fallback instead of closing
  // the tab with history.back().
  const navigationStackRef = useRef<string[]>([pathname]);
  const navigationIndexRef = useRef(0);
  const popStateRef = useRef(false);

  useEffect(() => {
    function handlePopState() {
      popStateRef.current = true;
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const stack = navigationStackRef.current;
    const currentIndex = navigationIndexRef.current;

    if (stack[currentIndex] === pathname) {
      popStateRef.current = false;
      return;
    }

    if (popStateRef.current) {
      const existingIndex = stack.lastIndexOf(pathname);

      if (existingIndex >= 0) {
        navigationIndexRef.current = existingIndex;
      } else {
        navigationStackRef.current = [pathname];
        navigationIndexRef.current = 0;
      }

      popStateRef.current = false;
      return;
    }

    const nextStack = stack.slice(0, currentIndex + 1);
    nextStack.push(pathname);
    navigationStackRef.current = nextStack;
    navigationIndexRef.current = nextStack.length - 1;
  }, [pathname]);

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
      if (navigationIndexRef.current > 0) {
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
