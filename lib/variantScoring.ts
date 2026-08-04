import type { ParsedAnswer } from "@/lib/answer";

type VariantScoringInput = {
  egeNumber: number;
  correctAnswer: unknown;
  normalizedStudentAnswer: ParsedAnswer | null;
  isFullyCorrect: boolean;
};

function compareNumbers(first: number, second: number) {
  return Math.abs(first - second) < 1e-9;
}

function isNumberList(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number")
  );
}

function isPairList(value: unknown): value is number[][] {
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

function countMatchingNumbers(student: number[], correct: number[]) {
  const remaining = [...correct];
  let matches = 0;

  for (const number of student) {
    const matchIndex = remaining.findIndex((candidate) =>
      compareNumbers(number, candidate)
    );

    if (matchIndex !== -1) {
      matches += 1;
      remaining.splice(matchIndex, 1);
    }
  }

  return matches;
}

function pairsAreEqual(first: number[], second: number[]) {
  return (
    first.length === 2 &&
    second.length === 2 &&
    compareNumbers(first[0], second[0]) &&
    compareNumbers(first[1], second[1])
  );
}

function countMatchingPairs(student: number[][], correct: number[][]) {
  const remaining = correct.map((pair) => [...pair]);
  let matches = 0;

  for (const pair of student) {
    const matchIndex = remaining.findIndex((candidate) =>
      pairsAreEqual(pair, candidate)
    );

    if (matchIndex !== -1) {
      matches += 1;
      remaining.splice(matchIndex, 1);
    }
  }

  return matches;
}

export function getVariantTaskMaxPoints(egeNumber: number) {
  return egeNumber === 26 || egeNumber === 27 ? 2 : 1;
}

export function getVariantAwardedPoints({
  egeNumber,
  correctAnswer,
  normalizedStudentAnswer,
  isFullyCorrect,
}: VariantScoringInput) {
  const maxPoints = getVariantTaskMaxPoints(egeNumber);

  if (isFullyCorrect) {
    return maxPoints;
  }

  if (
    egeNumber === 26 &&
    isNumberList(correctAnswer) &&
    correctAnswer.length === 2 &&
    isNumberList(normalizedStudentAnswer) &&
    normalizedStudentAnswer.length >= 1 &&
    normalizedStudentAnswer.length <= 2
  ) {
    return countMatchingNumbers(normalizedStudentAnswer, correctAnswer) >= 1
      ? 1
      : 0;
  }

  if (
    egeNumber === 27 &&
    isPairList(correctAnswer) &&
    correctAnswer.length === 2 &&
    isPairList(normalizedStudentAnswer) &&
    normalizedStudentAnswer.length >= 1 &&
    normalizedStudentAnswer.length <= 2
  ) {
    return countMatchingPairs(normalizedStudentAnswer, correctAnswer) >= 1
      ? 1
      : 0;
  }

  return 0;
}
