import { parseStudentLearningAnalytics } from "./analyticsSchema";
import { studyPlanSchema, type StudyPlan } from "./planSchema";
import type { StudentLearningAnalytics } from "./types";

export type StudyPlanView = StudyPlan & {
  id: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  provider: string;
  providerLabel: string;
  analytics: StudentLearningAnalytics;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
};

export function getStudyPlanProviderLabel(provider: string) {
  if (provider === "mock") return "Mock (локально)";
  if (provider === "mock:fallback") return "Mock (резервный режим)";
  if (provider.startsWith("openai-compatible:")) {
    return `AI · ${provider.slice("openai-compatible:".length)}`;
  }
  return provider;
}

type StudyPlanRecord = {
  id: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  title: string;
  summary: string;
  durationDays: number;
  topics: unknown;
  actions: unknown;
  analyticsSnapshot: unknown;
  createdAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  generation: {
    provider: string;
  };
};

export function toStudyPlanView(record: StudyPlanRecord): StudyPlanView {
  const plan = studyPlanSchema.parse({
    title: record.title,
    summary: record.summary,
    durationDays: record.durationDays,
    topics: record.topics,
    actions: record.actions,
  });

  return {
    id: record.id,
    status: record.status,
    provider: record.generation.provider,
    providerLabel: getStudyPlanProviderLabel(record.generation.provider),
    analytics: parseStudentLearningAnalytics(record.analyticsSnapshot),
    createdAt: record.createdAt.toISOString(),
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    ...plan,
  };
}
