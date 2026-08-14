import {
  AI_METHODOLOGY,
  type LearningAnalyticsInput,
  type MasteryCategory,
  type StudentLearningAnalytics,
} from "./types";
import type { LearningErrorCauseValue } from "./errorCauses";
import { getMasteryState } from "@/lib/mastery";

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
  return getMasteryState(input.total, input.overallAccuracy, {
    recentAccuracy: input.recentAccuracy,
    trend: input.trend,
    currentErrorStreak: input.errorStreak,
  });
}

export function analyzeStudentLearning(
  input: LearningAnalyticsInput
): StudentLearningAnalytics {
  const grouped = new Map<number, LearningAnalyticsInput["answers"]>();

  const eligibleAnswers = input.answers.filter(
    (answer) => answer.countsForMastery !== false
  );

  for (const answer of eligibleAnswers) {
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
      const skills = new Map<string, typeof answers>();
      const errorCauses: Partial<Record<LearningErrorCauseValue, number>> = {};

      for (const answer of answers) {
        const skill = answer.skillTag?.trim();
        if (skill) {
          const skillAnswers = skills.get(skill) ?? [];
          skillAnswers.push(answer);
          skills.set(skill, skillAnswers);
        }
        if (!answer.isCorrect && answer.errorCause) {
          errorCauses[answer.errorCause] = (errorCauses[answer.errorCause] ?? 0) + 1;
        }
      }

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
        skillBreakdown: Array.from(skills.entries())
          .map(([skill, skillAnswers]) => ({
            skill,
            attempts: skillAnswers.length,
            accuracy: percent(
              skillAnswers.filter((answer) => answer.isCorrect).length,
              skillAnswers.length
            ),
          }))
          .sort((first, second) =>
            first.accuracy - second.accuracy || first.skill.localeCompare(second.skill)
          ),
        errorCauses,
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
  const totalCorrect = eligibleAnswers.filter((answer) => answer.isCorrect).length;

  return {
    totalAnswers: eligibleAnswers.length,
    overallAccuracy: percent(totalCorrect, eligibleAnswers.length),
    sources: {
      HOMEWORK: eligibleAnswers.filter((answer) => answer.source === "HOMEWORK").length,
      PRACTICE: eligibleAnswers.filter((answer) => answer.source === "PRACTICE").length,
      VARIANT: eligibleAnswers.filter((answer) => answer.source === "VARIANT").length,
      DIAGNOSTIC: eligibleAnswers.filter((answer) => answer.source === "DIAGNOSTIC").length,
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
