import type { LearningErrorCauseValue } from "./errorCauses";
import type { StudyPlan } from "./planSchema";

const DAY_MS = 24 * 60 * 60 * 1000;

export type StudyPlanAttemptForProgress = {
  studyPlanActionIndex: number | null;
  studyPlanAttemptKind?: "PRACTICE" | "CONTROL" | null;
  errorCause?: LearningErrorCauseValue | null;
  isCorrect: boolean;
  createdAt?: Date | string;
};

export type StudyPlanProgress = {
  completedTasks: number;
  totalTasks: number;
  completedActions: number;
  totalActions: number;
  percent: number;
  isCompleted: boolean;
  actions: Array<{
    actionIndex: number;
    attempted: number;
    correct: number;
    target: number;
    rollingAccuracy: number;
    minimumAccuracy: number;
    volumeMet: boolean;
    accuracyMet: boolean;
    controlDelayDays: number;
    controlAvailableAt: string | null;
    controlAttempted: number;
    controlPassed: boolean;
    errorCauses: Partial<Record<LearningErrorCauseValue, number>>;
    percent: number;
    isCompleted: boolean;
  }>;
};

function attemptTime(attempt: StudyPlanAttemptForProgress, index: number) {
  if (!attempt.createdAt) return index;
  const timestamp = new Date(attempt.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : index;
}

function accuracy(attempts: StudyPlanAttemptForProgress[]) {
  if (attempts.length === 0) return 0;
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  return Math.round((correct / attempts.length) * 100);
}

export function calculateStudyPlanProgress(
  plan: Pick<StudyPlan, "actions">,
  attempts: StudyPlanAttemptForProgress[] = []
): StudyPlanProgress {
  const actions = plan.actions.map((action, actionIndex) => {
    const linkedAttempts = attempts
      .filter((attempt) => attempt.studyPlanActionIndex === actionIndex)
      .sort((first, second) =>
        attemptTime(first, 0) - attemptTime(second, 0)
      );
    const practiceAttempts = linkedAttempts.filter(
      (attempt) => attempt.studyPlanAttemptKind !== "CONTROL"
    );
    const controlAttempts = linkedAttempts.filter(
      (attempt) => attempt.studyPlanAttemptKind === "CONTROL"
    );
    const recentWindow = practiceAttempts.slice(-action.taskCount);
    const rollingAccuracy = accuracy(recentWindow);
    const volumeMet = practiceAttempts.length >= action.taskCount;
    const accuracyMet = volumeMet && rollingAccuracy >= action.minimumAccuracy;

    let masteryReachedAt: number | null = null;
    for (let end = action.taskCount; end <= practiceAttempts.length; end += 1) {
      const window = practiceAttempts.slice(end - action.taskCount, end);
      if (accuracy(window) >= action.minimumAccuracy) {
        masteryReachedAt = attemptTime(practiceAttempts[end - 1], end - 1);
        break;
      }
    }

    const controlAvailableTimestamp =
      masteryReachedAt === null
        ? null
        : masteryReachedAt + action.controlDelayDays * DAY_MS;
    const controlPassed =
      controlAvailableTimestamp !== null &&
      controlAttempts.some(
        (attempt, index) =>
          attempt.isCorrect &&
          attemptTime(attempt, index) >= controlAvailableTimestamp
      );
    const errorCauses: Partial<Record<LearningErrorCauseValue, number>> = {};

    for (const attempt of linkedAttempts) {
      if (!attempt.isCorrect && attempt.errorCause) {
        errorCauses[attempt.errorCause] = (errorCauses[attempt.errorCause] ?? 0) + 1;
      }
    }

    const volumeProgress = Math.min(practiceAttempts.length / action.taskCount, 1);
    const accuracyProgress = volumeMet
      ? Math.min(rollingAccuracy / action.minimumAccuracy, 1)
      : 0;
    const percent = Math.round(
      volumeProgress * 40 + accuracyProgress * 40 + (controlPassed ? 20 : 0)
    );
    const isCompleted = volumeMet && accuracyMet && controlPassed;

    return {
      actionIndex,
      attempted: practiceAttempts.length,
      correct: practiceAttempts.filter((attempt) => attempt.isCorrect).length,
      target: action.taskCount,
      rollingAccuracy,
      minimumAccuracy: action.minimumAccuracy,
      volumeMet,
      accuracyMet,
      controlDelayDays: action.controlDelayDays,
      controlAvailableAt:
        controlAvailableTimestamp === null
          ? null
          : new Date(controlAvailableTimestamp).toISOString(),
      controlAttempted: controlAttempts.length,
      controlPassed,
      errorCauses,
      percent,
      isCompleted,
    };
  });
  const totalTasks = actions.reduce((sum, action) => sum + action.target, 0);
  const completedTasks = actions.reduce(
    (sum, action) => sum + Math.min(action.attempted, action.target),
    0
  );
  const completedActions = actions.filter((action) => action.isCompleted).length;

  return {
    completedTasks,
    totalTasks,
    completedActions,
    totalActions: actions.length,
    percent:
      actions.length === 0
        ? 0
        : Math.round(
            actions.reduce((sum, action) => sum + action.percent, 0) /
              actions.length
          ),
    isCompleted: actions.length > 0 && completedActions === actions.length,
    actions,
  };
}
