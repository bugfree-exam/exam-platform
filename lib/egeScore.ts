const EGE_TEST_SCORE_BY_PRIMARY = [
  0, 7, 14, 20, 27, 34, 40, 43, 46, 48,
  51, 54, 57, 60, 63, 66, 69, 72, 75, 78,
  81, 84, 87, 90, 93, 95, 97, 98, 99, 100,
] as const;

export const MAX_EGE_PRIMARY_SCORE = 29;
export const MAX_EGE_TEST_SCORE = 100;

export function primaryToEgeTestScore(primaryScore: number): number {
  const normalizedScore = Math.min(
    MAX_EGE_PRIMARY_SCORE,
    Math.max(0, Math.round(primaryScore))
  );

  return EGE_TEST_SCORE_BY_PRIMARY[normalizedScore];
}
