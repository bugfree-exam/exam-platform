import { z } from "zod";

export const PLAN_LIMITS = {
  maxTopics: 5,
  maxDays: 14,
  maxActions: 20,
  maxTasksPerAction: 20,
  maxTotalTasks: 100,
} as const;

const topicSchema = z
  .object({
    egeNumber: z.number().int().min(1).max(27),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    reason: z.string().min(1).max(300),
  })
  .strict();

const actionSchema = z
  .object({
    day: z.number().int().min(1).max(PLAN_LIMITS.maxDays),
    egeNumber: z.number().int().min(1).max(27),
    skill: z.string().min(1).max(200).default("Уточнить навык внутри темы"),
    taskCount: z.number().int().min(1).max(PLAN_LIMITS.maxTasksPerAction),
    minimumAccuracy: z.number().int().min(70).max(100).default(75),
    controlDelayDays: z.number().int().min(1).max(7).default(2),
    goal: z.string().min(1).max(300),
  })
  .strict();

export const studyPlanSchema = z
  .object({
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(800),
    durationDays: z.number().int().min(1).max(PLAN_LIMITS.maxDays),
    topics: z.array(topicSchema).min(1).max(PLAN_LIMITS.maxTopics),
    actions: z.array(actionSchema).min(1).max(PLAN_LIMITS.maxActions),
  })
  .strict()
  .superRefine((plan, context) => {
    const topicNumbers = new Set(plan.topics.map((topic) => topic.egeNumber));
    const totalTasks = plan.actions.reduce((sum, action) => sum + action.taskCount, 0);

    if (totalTasks > PLAN_LIMITS.maxTotalTasks) {
      context.addIssue({
        code: "custom",
        message: `План превышает лимит ${PLAN_LIMITS.maxTotalTasks} задач`,
        path: ["actions"],
      });
    }

    for (const [index, action] of plan.actions.entries()) {
      if (!topicNumbers.has(action.egeNumber)) {
        context.addIssue({
          code: "custom",
          message: "Действие ссылается на тему, которой нет в плане",
          path: ["actions", index, "egeNumber"],
        });
      }
      if (action.day > plan.durationDays) {
        context.addIssue({
          code: "custom",
          message: "День действия выходит за длительность плана",
          path: ["actions", index, "day"],
        });
      }
    }
  });

export type StudyPlan = z.infer<typeof studyPlanSchema>;

export function validateStudyPlan(candidate: unknown): StudyPlan {
  return studyPlanSchema.parse(candidate);
}
