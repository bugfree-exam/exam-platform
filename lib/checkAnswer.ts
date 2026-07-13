import { TaskAnswerType } from "@prisma/client";

import { ParsedAnswer, parseCorrectAnswer } from "@/lib/answer";

type CheckAnswerInput = {
  answerType: TaskAnswerType;
  correctAnswer: unknown;
  studentAnswerText: string;
};

type CheckAnswerResult = {
  isCorrect: boolean;
  normalizedStudentAnswer: ParsedAnswer | null;
  error?: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isPairArray(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 2 &&
        item.every((number) => typeof number === "number")
    )
  );
}

function compareNumbers(a: number, b: number) {
  return Math.abs(a - b) < 1e-9;
}

function compareNumberLists(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => compareNumbers(value, b[index]));
}

function comparePairListsOrdered(a: number[][], b: number[][]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((pair, index) => compareNumberLists(pair, b[index]));
}

function sortPairs(pairs: number[][]) {
  return [...pairs].sort((a, b) => {
    if (a[0] !== b[0]) {
      return a[0] - b[0];
    }

    return a[1] - b[1];
  });
}

function comparePairListsUnordered(a: number[][], b: number[][]) {
  return comparePairListsOrdered(sortPairs(a), sortPairs(b));
}

export function checkAnswer({
  answerType,
  correctAnswer,
  studentAnswerText,
}: CheckAnswerInput): CheckAnswerResult {
  if (!studentAnswerText.trim()) {
    return {
      isCorrect: false,
      normalizedStudentAnswer: null,
      error: "Ответ не указан",
    };
  }

  let normalizedStudentAnswer: ParsedAnswer;

  try {
    normalizedStudentAnswer = parseCorrectAnswer(answerType, studentAnswerText);
  } catch (error) {
    return {
      isCorrect: false,
      normalizedStudentAnswer: null,
      error:
        error instanceof Error
          ? error.message
          : "Не удалось распознать ответ ученика",
    };
  }

  switch (answerType) {
    case TaskAnswerType.TEXT: {
      if (typeof correctAnswer !== "string") {
        return {
          isCorrect: false,
          normalizedStudentAnswer,
          error: "Правильный ответ задачи хранится в неверном формате",
        };
      }

      return {
        isCorrect:
          typeof normalizedStudentAnswer === "string" &&
          normalizeText(normalizedStudentAnswer) === normalizeText(correctAnswer),
        normalizedStudentAnswer,
      };
    }

    case TaskAnswerType.NUMBER: {
      if (typeof correctAnswer !== "number") {
        return {
          isCorrect: false,
          normalizedStudentAnswer,
          error: "Правильный ответ задачи хранится в неверном формате",
        };
      }

      return {
        isCorrect:
          typeof normalizedStudentAnswer === "number" &&
          compareNumbers(normalizedStudentAnswer, correctAnswer),
        normalizedStudentAnswer,
      };
    }

    case TaskAnswerType.NUMBER_LIST: {
      if (!isNumberArray(correctAnswer)) {
        return {
          isCorrect: false,
          normalizedStudentAnswer,
          error: "Правильный ответ задачи хранится в неверном формате",
        };
      }

      return {
        isCorrect:
          isNumberArray(normalizedStudentAnswer) &&
          compareNumberLists(normalizedStudentAnswer, correctAnswer),
        normalizedStudentAnswer,
      };
    }

    case TaskAnswerType.PAIR_LIST_ORDERED: {
      if (!isPairArray(correctAnswer)) {
        return {
          isCorrect: false,
          normalizedStudentAnswer,
          error: "Правильный ответ задачи хранится в неверном формате",
        };
      }

      return {
        isCorrect:
          isPairArray(normalizedStudentAnswer) &&
          comparePairListsOrdered(normalizedStudentAnswer, correctAnswer),
        normalizedStudentAnswer,
      };
    }

    case TaskAnswerType.PAIR_LIST_UNORDERED: {
      if (!isPairArray(correctAnswer)) {
        return {
          isCorrect: false,
          normalizedStudentAnswer,
          error: "Правильный ответ задачи хранится в неверном формате",
        };
      }

      return {
        isCorrect:
          isPairArray(normalizedStudentAnswer) &&
          comparePairListsUnordered(normalizedStudentAnswer, correctAnswer),
        normalizedStudentAnswer,
      };
    }

    default:
      return {
        isCorrect: false,
        normalizedStudentAnswer,
        error: "Неизвестный тип ответа",
      };
  }
}