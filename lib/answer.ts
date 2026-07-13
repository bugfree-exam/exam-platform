import { TaskAnswerType } from "@prisma/client";

export type ParsedAnswer = string | number | number[] | number[][];

function parseNumber(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    throw new Error(`"${value}" не является числом`);
  }

  return number;
}

function splitToNumbers(value: string): number[] {
  return value
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseNumber);
}

function parsePairList(value: string): number[][] {
  const rows = value
    .split(/[\n;]+/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    throw new Error("Укажите хотя бы одну пару чисел");
  }

  return rows.map((row, index) => {
    const numbers = row
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(parseNumber);

    if (numbers.length !== 2) {
      throw new Error(
        `В строке ${index + 1} должна быть ровно одна пара чисел`
      );
    }

    return numbers;
  });
}

export function parseCorrectAnswer(
  answerType: TaskAnswerType,
  value: string
): ParsedAnswer {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Правильный ответ не может быть пустым");
  }

  switch (answerType) {
    case TaskAnswerType.TEXT:
      return trimmed.replace(/\s+/g, " ");

    case TaskAnswerType.NUMBER:
      return parseNumber(trimmed);

    case TaskAnswerType.NUMBER_LIST: {
      const numbers = splitToNumbers(trimmed);

      if (numbers.length === 0) {
        throw new Error("Укажите хотя бы одно число");
      }

      return numbers;
    }

    case TaskAnswerType.PAIR_LIST_ORDERED:
    case TaskAnswerType.PAIR_LIST_UNORDERED:
      return parsePairList(trimmed);

    default:
      throw new Error("Неизвестный тип ответа");
  }
}

export function answerToTeacherInput(answer: unknown): string {
  if (Array.isArray(answer)) {
    if (answer.every((item) => Array.isArray(item))) {
      return answer
        .map((pair) => {
          if (!Array.isArray(pair)) {
            return "";
          }

          return pair.join(" ");
        })
        .join("\n");
    }

    return answer.join(" ");
  }

  if (answer === null || answer === undefined) {
    return "";
  }

  return String(answer);
}

export function formatAnswerForDisplay(answer: unknown): string {
  if (Array.isArray(answer)) {
    if (answer.every((item) => Array.isArray(item))) {
      return answer
        .map((pair) => {
          if (!Array.isArray(pair)) {
            return "";
          }

          return `(${pair.join("; ")})`;
        })
        .join(", ");
    }

    return answer.join(", ");
  }

  if (answer === null || answer === undefined) {
    return "—";
  }

  return String(answer);
}

export function getAnswerTypeLabel(answerType: TaskAnswerType | string) {
  const labels: Record<string, string> = {
    TEXT: "Текст",
    NUMBER: "Одно число",
    NUMBER_LIST: "Список чисел",
    PAIR_LIST_ORDERED: "Пары чисел, порядок важен",
    PAIR_LIST_UNORDERED: "Пары чисел, порядок не важен",
  };

  return labels[answerType] ?? answerType;
}