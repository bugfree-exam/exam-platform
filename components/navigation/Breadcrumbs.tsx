"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type RouteDefinition = {
  pattern: RegExp;
  label: string | ((pathname: string) => string);
};

type BreadcrumbItem = {
  href: string;
  label: string;
};

const routeDefinitions: RouteDefinition[] = [
  { pattern: /^\/practice$/, label: "Открытый тренажёр" },
  { pattern: /^\/practice\/[^/]+$/, label: "Задание" },

  { pattern: /^\/student$/, label: "Главная" },
  { pattern: /^\/student\/calendar$/, label: "Календарь" },
  { pattern: /^\/student\/diagnostic$/, label: "Входная диагностика" },
  { pattern: /^\/student\/errors$/, label: "Исправление ошибок" },
  { pattern: /^\/student\/homeworks$/, label: "Домашние задания" },
  { pattern: /^\/student\/homeworks\/[^/]+$/, label: "Домашняя работа" },
  { pattern: /^\/student\/recovery$/, label: "Восстановление" },
  { pattern: /^\/student\/results$/, label: "Результаты" },
  { pattern: /^\/student\/route$/, label: "Маршрут" },
  { pattern: /^\/student\/skills$/, label: "Карта навыков" },
  { pattern: /^\/student\/solutions$/, label: "Мои решения" },
  { pattern: /^\/student\/start$/, label: "Цель подготовки" },
  { pattern: /^\/student\/study-plan$/, label: "Ближайший спринт" },
  { pattern: /^\/student\/telegram$/, label: "Telegram" },
  { pattern: /^\/student\/trainer$/, label: "Тренажёр" },
  {
    pattern: /^\/student\/trainer\/[^/]+$/,
    label: (pathname) => {
      const egeNumber = pathname.split("/").at(-1);
      return /^\d+$/.test(egeNumber ?? "")
        ? `Задание №${egeNumber}`
        : "Тренировка";
    },
  },
  { pattern: /^\/student\/variants$/, label: "Варианты" },
  { pattern: /^\/student\/variants\/help$/, label: "Справка" },
  {
    pattern: /^\/student\/variants\/progress$/,
    label: "Прогресс по вариантам",
  },
  { pattern: /^\/student\/variants\/[^/]+$/, label: "Вариант" },
  {
    pattern: /^\/student\/variants\/[^/]+\/attempt\/[^/]+$/,
    label: "Решение варианта",
  },
  {
    pattern: /^\/student\/variants\/[^/]+\/results\/[^/]+$/,
    label: "Результат варианта",
  },
  { pattern: /^\/student\/webinars$/, label: "Вебинары" },
  { pattern: /^\/student\/webinars\/[^/]+$/, label: "Вебинар" },
  {
    pattern: /^\/student\/webinars\/[^/]+\/practice\/[^/]+$/,
    label: "Практика вебинара",
  },

  { pattern: /^\/teacher$/, label: "Главная" },
  { pattern: /^\/teacher\/course$/, label: "Годовой курс" },
  { pattern: /^\/teacher\/homeworks$/, label: "Домашние задания" },
  { pattern: /^\/teacher\/homeworks\/create$/, label: "Новое ДЗ" },
  { pattern: /^\/teacher\/homeworks\/review$/, label: "Проверка ДЗ" },
  { pattern: /^\/teacher\/homeworks\/[^/]+$/, label: "Домашняя работа" },
  {
    pattern: /^\/teacher\/homeworks\/[^/]+\/edit$/,
    label: "Редактирование ДЗ",
  },
  { pattern: /^\/teacher\/results$/, label: "Результаты" },
  { pattern: /^\/teacher\/solutions$/, label: "Решения учеников" },
  { pattern: /^\/teacher\/students$/, label: "Ученики" },
  { pattern: /^\/teacher\/students\/create$/, label: "Новый ученик" },
  { pattern: /^\/teacher\/students\/[^/]+$/, label: "Ученик" },
  {
    pattern: /^\/teacher\/students\/[^/]+\/activity$/,
    label: "Активность",
  },
  {
    pattern: /^\/teacher\/students\/[^/]+\/parent-report$/,
    label: "Отчёт для родителя",
  },
  { pattern: /^\/teacher\/tasks$/, label: "Задания" },
  { pattern: /^\/teacher\/tasks\/create$/, label: "Новое задание" },
  { pattern: /^\/teacher\/tasks\/[^/]+$/, label: "Задание" },
  {
    pattern: /^\/teacher\/tasks\/[^/]+\/edit$/,
    label: "Редактирование задания",
  },
  { pattern: /^\/teacher\/variants$/, label: "Варианты" },
  { pattern: /^\/teacher\/variants\/create$/, label: "Новый вариант" },
  { pattern: /^\/teacher\/variants\/[^/]+$/, label: "Вариант" },
  {
    pattern: /^\/teacher\/variants\/[^/]+\/assign$/,
    label: "Назначение варианта",
  },
  {
    pattern: /^\/teacher\/variants\/attempts\/[^/]+$/,
    label: "Ответы ученика",
  },
  {
    pattern: /^\/teacher\/webinar-schedule$/,
    label: "Расписание вебинаров",
  },
  { pattern: /^\/teacher\/webinars$/, label: "Вебинары" },
  { pattern: /^\/teacher\/webinars\/create$/, label: "Новый вебинар" },
  { pattern: /^\/teacher\/webinars\/[^/]+$/, label: "Вебинар" },
  {
    pattern: /^\/teacher\/webinars\/[^/]+\/edit$/,
    label: "Редактирование вебинара",
  },
];

function findRoute(pathname: string) {
  return routeDefinitions.find((route) => route.pattern.test(pathname));
}

export function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  if (pathname === "/" || pathname === "/login") return [];

  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const route = findRoute(href);

    if (!route) continue;

    items.push({
      href,
      label:
        typeof route.label === "function" ? route.label(href) : route.label,
    });
  }

  return items;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Хлебные крошки"
      className="app-breadcrumbs sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 text-slate-600 shadow-sm backdrop-blur"
    >
      <ol className="mx-auto flex min-h-11 max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 text-xs sm:px-6 sm:text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={item.href} className="flex shrink-0 items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-300">
                  ›
                </span>
              ) : null}

              {isCurrent ? (
                <span
                  aria-current="page"
                  className="max-w-56 truncate font-bold text-slate-950"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="font-semibold transition hover:text-cyan-700"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
