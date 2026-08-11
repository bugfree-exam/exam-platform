import { validateStudyPlan, type StudyPlan } from "./planSchema";
import type { StudyPlanProvider } from "./providers/provider";
import type { StudentLearningAnalytics } from "./types";

export async function generateValidatedStudyPlan(
  provider: StudyPlanProvider,
  analytics: StudentLearningAnalytics
): Promise<StudyPlan> {
  const untrustedResult = await provider.generatePlan(analytics);
  return validateStudyPlan(untrustedResult);
}
