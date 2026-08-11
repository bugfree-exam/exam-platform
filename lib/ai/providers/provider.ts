import type { StudentLearningAnalytics } from "../types";

export interface StudyPlanProvider {
  readonly name: string;
  generatePlan(analytics: StudentLearningAnalytics): Promise<unknown>;
}
