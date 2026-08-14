export const MASTERY_POLICY = {
  minimumIndependentAttempts: 3,
  criticalAccuracyBelow: 40,
  practiceAccuracyBelow: 65,
  masteredAccuracyAtLeast: 85,
  mediumConfidenceAt: 3,
  highConfidenceAt: 7,
  recentEvidenceWindow: 5,
  criticalErrorStreak: 3,
  significantDecline: -30,
} as const;

export type MasteryState =
  | "INSUFFICIENT_DATA"
  | "CRITICAL_GAP"
  | "PRACTICE"
  | "CONSOLIDATE"
  | "MASTERED";

export type MasteryConfidence = "LOW" | "MEDIUM" | "HIGH";

export const MASTERY_LABELS: Record<MasteryState, string> = {
  INSUFFICIENT_DATA: "Мало данных",
  CRITICAL_GAP: "Критический пробел",
  PRACTICE: "Нужна практика",
  CONSOLIDATE: "Закрепляется",
  MASTERED: "Освоено",
};

export function getMasteryState(
  independentAttempts: number,
  accuracy: number,
  signals?: {
    recentAccuracy?: number | null;
    trend?: number | null;
    currentErrorStreak?: number;
  }
): MasteryState {
  if (independentAttempts < MASTERY_POLICY.minimumIndependentAttempts) {
    return "INSUFFICIENT_DATA";
  }
  const effectiveAccuracy = signals?.recentAccuracy ?? accuracy;
  const criticalDecline =
    signals?.trend !== null &&
    signals?.trend !== undefined &&
    signals.trend <= MASTERY_POLICY.significantDecline &&
    effectiveAccuracy < MASTERY_POLICY.practiceAccuracyBelow;
  if (
    effectiveAccuracy < MASTERY_POLICY.criticalAccuracyBelow ||
    (signals?.currentErrorStreak ?? 0) >= MASTERY_POLICY.criticalErrorStreak ||
    criticalDecline
  ) {
    return "CRITICAL_GAP";
  }
  if (effectiveAccuracy < MASTERY_POLICY.practiceAccuracyBelow) return "PRACTICE";
  if (effectiveAccuracy < MASTERY_POLICY.masteredAccuracyAtLeast) return "CONSOLIDATE";
  return "MASTERED";
}

export function getMasteryConfidence(
  independentAttempts: number
): MasteryConfidence {
  if (independentAttempts < MASTERY_POLICY.mediumConfidenceAt) return "LOW";
  if (independentAttempts < MASTERY_POLICY.highConfidenceAt) return "MEDIUM";
  return "HIGH";
}
