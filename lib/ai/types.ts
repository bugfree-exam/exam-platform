export type AttemptSource = "HOMEWORK" | "PRACTICE" | "VARIANT";

export type LearningAnswer = {
  egeNumber: number;
  skillTag?: string | null;
  errorCause?: import("./errorCauses").LearningErrorCauseValue | null;
  isCorrect: boolean;
  attemptedAt: Date;
  source: AttemptSource;
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

export type MasteryCategory =
  | "INSUFFICIENT_DATA"
  | "CRITICAL_GAP"
  | "PRACTICE"
  | "CONSOLIDATE"
  | "MASTERED";

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
  recentAttemptsPerTopic: 5,
  previousAttemptsPerTopic: 5,
  minimumAttemptsForAssessment: 3,
  criticalAccuracyBelow: 40,
  practiceAccuracyBelow: 65,
  masteredAccuracyAtLeast: 85,
  criticalErrorStreak: 3,
  significantDecline: -30,
  variantTrendThreshold: 5,
} as const;
