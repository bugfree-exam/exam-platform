import type { StudyPlan } from "./planSchema";
import { generateValidatedStudyPlan } from "./generateStudyPlan";
import { MockStudyPlanProvider } from "./providers/mock";
import type { StudyPlanProvider } from "./providers/provider";
import type { StudentLearningAnalytics } from "./types";

export type StudyPlanGenerationResult = {
  plan: StudyPlan;
  provider: StudyPlanProvider;
  failedPrimary: { provider: string; error: unknown } | null;
};

export async function generateStudyPlanWithFallback(
  primary: StudyPlanProvider,
  analytics: StudentLearningAnalytics
): Promise<StudyPlanGenerationResult> {
  try {
    return {
      plan: await generateValidatedStudyPlan(primary, analytics),
      provider: primary,
      failedPrimary: null,
    };
  } catch (error) {
    if (primary.name === "mock") {
      throw error;
    }

    const fallback = new MockStudyPlanProvider("mock:fallback");
    return {
      plan: await generateValidatedStudyPlan(fallback, analytics),
      provider: fallback,
      failedPrimary: { provider: primary.name, error },
    };
  }
}
