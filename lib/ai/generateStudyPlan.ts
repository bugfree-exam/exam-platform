import { validateStudyPlan, type StudyPlan } from "./planSchema";
import type { StudyPlanProvider } from "./providers/provider";
import type { StudentLearningAnalytics } from "./types";

export async function generateValidatedStudyPlan(
  provider: StudyPlanProvider,
  analytics: StudentLearningAnalytics
): Promise<StudyPlan> {
  const untrustedResult = await provider.generatePlan(analytics);

  try {
    return validateStudyPlan(untrustedResult);
  } catch {
    // Validation errors may contain fragments of the untrusted provider output.
    // Never pass them to logs, the database or the teacher interface.
    throw new Error(
      "AI-провайдер вернул план, который не прошёл безопасную проверку"
    );
  }
}
