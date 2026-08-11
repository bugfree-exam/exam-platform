import type { StudyPlan } from "./planSchema";

export type StudyPlanAttemptForProgress = {
  studyPlanActionIndex: number | null;
  isCorrect: boolean;
};

export type StudyPlanProgress = {
  completedTasks: number;
  totalTasks: number;
  percent: number;
  isCompleted: boolean;
  actions: Array<{
    actionIndex: number;
    attempted: number;
    correct: number;
    target: number;
    percent: number;
    isCompleted: boolean;
  }>;
};

export function calculateStudyPlanProgress(
  plan: Pick<StudyPlan, "actions">,
  attempts: StudyPlanAttemptForProgress[] = []
): StudyPlanProgress {
  const actions = plan.actions.map((action, actionIndex) => {
    const linkedAttempts = attempts.filter(
      (attempt) => attempt.studyPlanActionIndex === actionIndex
    );
    const attempted = linkedAttempts.length;
    const completedForTarget = Math.min(attempted, action.taskCount);

    return {
      actionIndex,
      attempted,
      correct: linkedAttempts.filter((attempt) => attempt.isCorrect).length,
      target: action.taskCount,
      percent: Math.round((completedForTarget / action.taskCount) * 100),
      isCompleted: attempted >= action.taskCount,
    };
  });
  const totalTasks = actions.reduce((sum, action) => sum + action.target, 0);
  const completedTasks = actions.reduce(
    (sum, action) => sum + Math.min(action.attempted, action.target),
    0
  );

  return {
    completedTasks,
    totalTasks,
    percent:
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    isCompleted:
      actions.length > 0 && actions.every((action) => action.isCompleted),
    actions,
  };
}
