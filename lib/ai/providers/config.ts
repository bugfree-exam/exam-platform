import { z } from "zod";

import { MockStudyPlanProvider } from "./mock";
import { OpenAiCompatibleStudyPlanProvider } from "./openAiCompatible";
import type { StudyPlanProvider } from "./provider";

const providerConfigSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("mock") }).strict(),
  z
    .object({
      provider: z.literal("openai-compatible"),
      apiBaseUrl: z.string().url(),
      apiKey: z.string().min(1),
      model: z.string().min(1).max(120),
      timeoutMs: z.number().int().min(1_000).max(120_000),
    })
    .strict(),
]);

type ProviderEnvironment = Record<string, string | undefined>;

export function createConfiguredStudyPlanProvider(
  environment: ProviderEnvironment = process.env,
  fetchImpl: typeof fetch = fetch
): StudyPlanProvider {
  const provider = environment.AI_PROVIDER?.trim() || "mock";

  const rawConfig =
    provider === "mock"
      ? { provider }
      : {
          provider,
          apiBaseUrl: environment.AI_API_BASE_URL,
          apiKey: environment.AI_API_KEY,
          model: environment.AI_MODEL,
          timeoutMs: Number(environment.AI_REQUEST_TIMEOUT_MS || "30000"),
        };

  const parsed = providerConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error("Настройки AI-провайдера заполнены не полностью или некорректно");
  }

  if (parsed.data.provider === "mock") {
    return new MockStudyPlanProvider();
  }

  return new OpenAiCompatibleStudyPlanProvider({
    apiBaseUrl: parsed.data.apiBaseUrl,
    apiKey: parsed.data.apiKey,
    model: parsed.data.model,
    timeoutMs: parsed.data.timeoutMs,
    fetchImpl,
  });
}
