"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

type MobileBottomNavProps = {
  role: "student" | "teacher";
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 10.5 12 3l8.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.4-3.6 2.2-5.5 5.5-5.5s5.1 1.9 5.5 5.5" strokeLinecap="round" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.6M16 14c2.7.4 4.1 2 4.5 5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 19V9M12 19V5M19 19v-7" strokeLinecap="round" />
    </svg>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();

  const studentItems: NavItem[] = [
    { href: "/student", label: "Главная", icon: <HomeIcon />, exact: true },
    { href: "/student/homeworks", label: "ДЗ", icon: <CheckIcon /> },
    { href: "/student/trainer", label: "Тренажёр", icon: <GridIcon /> },
    { href: "/student/results", label: "Прогресс", icon: <ChartIcon /> },
    { href: "/student/webinars", label: "Вебинары", icon: <PlayIcon /> },
  ];

  const teacherItems: NavItem[] = [
    { href: "/teacher", label: "Главная", icon: <HomeIcon />, exact: true },
    { href: "/teacher/students", label: "Ученики", icon: <UsersIcon /> },
    { href: "/teacher/homeworks", label: "ДЗ", icon: <CheckIcon /> },
    { href: "/teacher/variants", label: "Варианты", icon: <GridIcon /> },
    { href: "/teacher/webinars", label: "Вебинары", icon: <PlayIcon /> },
  ];

  const items = role === "student" ? studentItems : teacherItems;

  return (
    <nav className="mobile-bottom-nav" aria-label={role === "student" ? "Навигация ученика" : "Навигация учителя"}>
      <div className="mobile-bottom-nav__inner">
        {items.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`mobile-bottom-nav__item${active ? " is-active" : ""}`}
            >
              <span className="mobile-bottom-nav__icon">{item.icon}</span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
