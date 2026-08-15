import type { MasteryState } from "@/lib/mastery";

export type SkillStage = "FOUNDATION" | "CORE" | "ADVANCED" | "EXAM";

export const DEFAULT_SKILL_LEVELS: Array<{
  key: SkillStage;
  title: string;
  description: string;
}> = [
  { key: "FOUNDATION", title: "База", description: "Базовые задания и темы, на которых строится дальнейшая подготовка." },
  { key: "CORE", title: "Основной блок", description: "Основная часть программы ЕГЭ и ключевые рабочие навыки." },
  { key: "ADVANCED", title: "Продвинутый блок", description: "Темы повышенной сложности и составные алгоритмы." },
  { key: "EXAM", title: "Экзаменационная вершина", description: "Самые сложные задачи и итоговая сборка навыков." },
];

export type EgeSkillNode = {
  egeNumber: number;
  title: string;
  shortTitle: string;
  stage: SkillStage;
  prerequisites: number[];
  estimatedMinutes: number;
};

export const EGE_SKILL_MAP: EgeSkillNode[] = [
  { egeNumber: 1, title: "Информационные модели и схемы", shortTitle: "Модели", stage: "FOUNDATION", prerequisites: [], estimatedMinutes: 100 },
  { egeNumber: 2, title: "Таблицы истинности", shortTitle: "Логика", stage: "FOUNDATION", prerequisites: [], estimatedMinutes: 150 },
  { egeNumber: 4, title: "Кодирование и условие Фано", shortTitle: "Коды", stage: "FOUNDATION", prerequisites: [], estimatedMinutes: 120 },
  { egeNumber: 5, title: "Исполнители и анализ алгоритмов", shortTitle: "Алгоритмы", stage: "FOUNDATION", prerequisites: [], estimatedMinutes: 180 },
  { egeNumber: 7, title: "Кодирование изображений и звука", shortTitle: "Медиа", stage: "FOUNDATION", prerequisites: [1], estimatedMinutes: 150 },
  { egeNumber: 11, title: "Объём текстовой информации", shortTitle: "Объём текста", stage: "FOUNDATION", prerequisites: [1, 7], estimatedMinutes: 120 },
  { egeNumber: 3, title: "Поиск в таблицах и базах данных", shortTitle: "Таблицы", stage: "CORE", prerequisites: [1], estimatedMinutes: 150 },
  { egeNumber: 6, title: "Циклы и вычислительный эксперимент", shortTitle: "Циклы", stage: "CORE", prerequisites: [5], estimatedMinutes: 180 },
  { egeNumber: 8, title: "Комбинаторика и перебор слов", shortTitle: "Комбинаторика", stage: "CORE", prerequisites: [5, 6], estimatedMinutes: 180 },
  { egeNumber: 9, title: "Обработка таблиц в электронных таблицах", shortTitle: "Таблицы Calc", stage: "CORE", prerequisites: [3], estimatedMinutes: 180 },
  { egeNumber: 10, title: "Информационный поиск в текстах", shortTitle: "Поиск в тексте", stage: "CORE", prerequisites: [], estimatedMinutes: 90 },
  { egeNumber: 12, title: "Редактор и преобразование строк", shortTitle: "Редактор", stage: "CORE", prerequisites: [5], estimatedMinutes: 150 },
  { egeNumber: 13, title: "IP-адреса и маски сети", shortTitle: "IP и маски", stage: "CORE", prerequisites: [1], estimatedMinutes: 180 },
  { egeNumber: 14, title: "Системы счисления", shortTitle: "Системы счисления", stage: "CORE", prerequisites: [5], estimatedMinutes: 210 },
  { egeNumber: 15, title: "Алгебра логики", shortTitle: "Логика выражений", stage: "CORE", prerequisites: [2], estimatedMinutes: 240 },
  { egeNumber: 16, title: "Рекурсия и вычисление функций", shortTitle: "Рекурсия", stage: "CORE", prerequisites: [5, 6], estimatedMinutes: 210 },
  { egeNumber: 17, title: "Обработка числовых файлов", shortTitle: "Файлы и списки", stage: "CORE", prerequisites: [5, 6], estimatedMinutes: 210 },
  { egeNumber: 18, title: "Оптимизация в электронных таблицах", shortTitle: "Оптимизация Calc", stage: "ADVANCED", prerequisites: [9], estimatedMinutes: 210 },
  { egeNumber: 19, title: "Теория игр: один вопрос", shortTitle: "Игры · 19", stage: "ADVANCED", prerequisites: [15, 16], estimatedMinutes: 180 },
  { egeNumber: 20, title: "Теория игр: две позиции", shortTitle: "Игры · 20", stage: "ADVANCED", prerequisites: [19], estimatedMinutes: 150 },
  { egeNumber: 21, title: "Теория игр: диапазон позиций", shortTitle: "Игры · 21", stage: "ADVANCED", prerequisites: [19, 20], estimatedMinutes: 150 },
  { egeNumber: 22, title: "Многопроцессные системы", shortTitle: "Процессы", stage: "ADVANCED", prerequisites: [5], estimatedMinutes: 150 },
  { egeNumber: 23, title: "Количество программ исполнителя", shortTitle: "Пути программ", stage: "ADVANCED", prerequisites: [5, 16], estimatedMinutes: 180 },
  { egeNumber: 24, title: "Обработка символьных файлов", shortTitle: "Строки и файлы", stage: "ADVANCED", prerequisites: [6, 17], estimatedMinutes: 240 },
  { egeNumber: 25, title: "Делители, маски и перебор", shortTitle: "Делители и маски", stage: "ADVANCED", prerequisites: [6, 14], estimatedMinutes: 240 },
  { egeNumber: 26, title: "Обработка и сортировка данных", shortTitle: "Сортировка данных", stage: "ADVANCED", prerequisites: [17], estimatedMinutes: 300 },
  { egeNumber: 27, title: "Программирование и оптимизация", shortTitle: "Задача 27", stage: "EXAM", prerequisites: [17, 24, 26], estimatedMinutes: 480 },
];

export const EGE_SKILL_BY_NUMBER = new Map(
  EGE_SKILL_MAP.map((skill) => [skill.egeNumber, skill]),
);

export function getSkillAvailability(
  skill: Pick<EgeSkillNode, "prerequisites">,
  masteryByNumber: Map<number, MasteryState>,
) {
  const missingPrerequisites = skill.prerequisites.filter((egeNumber) => {
    const state = masteryByNumber.get(egeNumber);
    return state !== "MASTERED" && state !== "CONSOLIDATE";
  });

  return {
    available: missingPrerequisites.length === 0,
    missingPrerequisites,
  };
}
