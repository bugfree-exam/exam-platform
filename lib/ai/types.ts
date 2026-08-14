import { MASTERY_POLICY, type MasteryState } from "@/lib/mastery";

export type AttemptSource = "HOMEWORK" | "PRACTICE" | "VARIANT" | "DIAGNOSTIC";

export type LearningAnswer = {
  taskId?: string;
  egeNumber: number;
  skillTag?: string | null;
  errorCause?: import("./errorCauses").LearningErrorCauseValue | null;
  isCorrect: boolean;
  attemptedAt: Date;
  source: AttemptSource;
  countsForMastery?: boolean;
};

export type VariantResult = {
  primaryScore: number;
  testScore: number;
  submittedAt: Date;
};

export type LearningAnalyticsInput = {
  answers: LearningAnswer[];
  variants: VariantResult[];
};

export type MasteryCategory = MasteryState;

export type TopicLearningAnalytics = {
  egeNumber: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  recentAttempts: number;
  recentAccuracy: number | null;
  previousAttempts: number;
  previousAccuracy: number | null;
  trend: number | null;
  currentErrorStreak: number;
  skillBreakdown: Array<{
    skill: string;
    attempts: number;
    accuracy: number;
  }>;
  errorCauses: Partial<
    Record<import("./errorCauses").LearningErrorCauseValue, number>
  >;
  category: MasteryCategory;
};

export type VariantLearningAnalytics = {
  attempts: number;
  latestPrimaryScore: number | null;
  latestTestScore: number | null;
  recentTestScores: number[];
  trend: "IMPROVING" | "DECLINING" | "STABLE" | "INSUFFICIENT_DATA";
  trendDelta: number | null;
};

/**
 * Deliberately contains no student id, name, email, raw answer or task text.
 * This is the only analytics shape an AI provider may receive.
 */
export type StudentLearningAnalytics = {
  totalAnswers: number;
  overallAccuracy: number;
  sources: Record<AttemptSource, number>;
  topics: TopicLearningAnalytics[];
  variants: VariantLearningAnalytics;
};

export const AI_METHODOLOGY = {
  recentAttemptsPerTopic: MASTERY_POLICY.recentEvidenceWindow,
  previousAttemptsPerTopic: MASTERY_POLICY.recentEvidenceWindow,
  minimumAttemptsForAssessment: MASTERY_POLICY.minimumIndependentAttempts,
  criticalAccuracyBelow: MASTERY_POLICY.criticalAccuracyBelow,
  practiceAccuracyBelow: MASTERY_POLICY.practiceAccuracyBelow,
  masteredAccuracyAtLeast: MASTERY_POLICY.masteredAccuracyAtLeast,
  criticalErrorStreak: MASTERY_POLICY.criticalErrorStreak,
  significantDecline: MASTERY_POLICY.significantDecline,
  variantTrendThreshold: 5,
} as const;
