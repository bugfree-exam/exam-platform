import {
  AI_METHODOLOGY,
  type LearningAnalyticsInput,
  type MasteryCategory,
  type StudentLearningAnalytics,
} from "./types";

function percent(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function classifyTopic(input: {
  total: number;
  overallAccuracy: number;
  recentAccuracy: number | null;
  trend: number | null;
  errorStreak: number;
}): MasteryCategory {
  if (input.total < AI_METHODOLOGY.minimumAttemptsForAssessment) {
    return "INSUFFICIENT_DATA";
  }

  const effectiveAccuracy = input.recentAccuracy ?? input.overallAccuracy;
  const hasCriticalDecline =
    input.trend !== null &&
    input.trend <= AI_METHODOLOGY.significantDecline &&
    effectiveAccuracy < AI_METHODOLOGY.practiceAccuracyBelow;

  if (
    effectiveAccuracy < AI_METHODOLOGY.criticalAccuracyBelow ||
    input.errorStreak >= AI_METHODOLOGY.criticalErrorStreak ||
    hasCriticalDecline
  ) {
    return "CRITICAL_GAP";
  }

  if (effectiveAccuracy < AI_METHODOLOGY.practiceAccuracyBelow) {
    return "PRACTICE";
  }
  if (effectiveAccuracy < AI_METHODOLOGY.masteredAccuracyAtLeast) {
    return "CONSOLIDATE";
  }
  return "MASTERED";
}

export function analyzeStudentLearning(
  input: LearningAnalyticsInput
): StudentLearningAnalytics {
  const grouped = new Map<number, LearningAnalyticsInput["answers"]>();

  for (const answer of input.answers) {
    if (!Number.isInteger(answer.egeNumber) || answer.egeNumber < 1 || answer.egeNumber > 27) {
      continue;
    }
    const topicAnswers = grouped.get(answer.egeNumber) ?? [];
    topicAnswers.push(answer);
    grouped.set(answer.egeNumber, topicAnswers);
  }

  const topics = Array.from(grouped.entries())
    .map(([egeNumber, unsortedAnswers]) => {
      const answers = [...unsortedAnswers].sort(
        (a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime()
      );
      const recent = answers.slice(0, AI_METHODOLOGY.recentAttemptsPerTopic);
      const previous = answers.slice(
        AI_METHODOLOGY.recentAttemptsPerTopic,
        AI_METHODOLOGY.recentAttemptsPerTopic +
          AI_METHODOLOGY.previousAttemptsPerTopic
      );
      const correct = answers.filter((answer) => answer.isCorrect).length;
      const recentCorrect = recent.filter((answer) => answer.isCorrect).length;
      const previousCorrect = previous.filter((answer) => answer.isCorrect).length;
      const recentAccuracy = recent.length
        ? percent(recentCorrect, recent.length)
        : null;
      const previousAccuracy = previous.length
        ? percent(previousCorrect, previous.length)
        : null;
      const trend =
        recent.length >= AI_METHODOLOGY.minimumAttemptsForAssessment &&
        previous.length >= AI_METHODOLOGY.minimumAttemptsForAssessment &&
        recentAccuracy !== null &&
        previousAccuracy !== null
          ? recentAccuracy - previousAccuracy
          : null;

      let currentErrorStreak = 0;
      for (const answer of answers) {
        if (answer.isCorrect) break;
        currentErrorStreak += 1;
      }

      const accuracy = percent(correct, answers.length);
      return {
        egeNumber,
        totalAttempts: answers.length,
        correctAttempts: correct,
        accuracy,
        recentAttempts: recent.length,
        recentAccuracy,
        previousAttempts: previous.length,
        previousAccuracy,
        trend,
        currentErrorStreak,
        category: classifyTopic({
          total: answers.length,
          overallAccuracy: accuracy,
          recentAccuracy,
          trend,
          errorStreak: currentErrorStreak,
        }),
      };
    })
    .sort((a, b) => a.egeNumber - b.egeNumber);

  const variants = [...input.variants].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
  );
  const recentVariants = variants.slice(-5);
  const recentTestScores = recentVariants.map((variant) => variant.testScore);
  const trendDelta =
    recentTestScores.length >= 2
      ? recentTestScores.at(-1)! - recentTestScores[0]
      : null;
  const variantTrend =
    trendDelta === null
      ? "INSUFFICIENT_DATA"
      : trendDelta >= AI_METHODOLOGY.variantTrendThreshold
        ? "IMPROVING"
        : trendDelta <= -AI_METHODOLOGY.variantTrendThreshold
          ? "DECLINING"
          : "STABLE";
  const latestVariant = variants.at(-1);
  const totalCorrect = input.answers.filter((answer) => answer.isCorrect).length;

  return {
    totalAnswers: input.answers.length,
    overallAccuracy: percent(totalCorrect, input.answers.length),
    sources: {
      HOMEWORK: input.answers.filter((answer) => answer.source === "HOMEWORK").length,
      PRACTICE: input.answers.filter((answer) => answer.source === "PRACTICE").length,
      VARIANT: input.answers.filter((answer) => answer.source === "VARIANT").length,
    },
    topics,
    variants: {
      attempts: variants.length,
      latestPrimaryScore: latestVariant?.primaryScore ?? null,
      latestTestScore: latestVariant?.testScore ?? null,
      recentTestScores,
      trend: variantTrend,
      trendDelta,
    },
  };
}
