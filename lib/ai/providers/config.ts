import { z } from "zod";

import { MockStudyPlanProvider } from "./mock";
import type { StudyPlanProvider } from "./provider";
import { YandexStudyPlanProvider } from "./yandex";

const providerConfigSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("mock") }).strict(),
  z
    .object({
      provider: z.literal("yandex"),
      apiKey: z.string().min(1),
      folderId: z.string().min(1).max(120),
      model: z.string().min(1).max(160),
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
          apiKey: environment.YANDEX_AI_API_KEY,
          folderId: environment.YANDEX_FOLDER_ID,
          model: environment.YANDEX_AI_MODEL?.trim() || "yandexgpt/latest",
          timeoutMs: Number(environment.AI_REQUEST_TIMEOUT_MS || "30000"),
        };

  const parsed = providerConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error("Настройки AI-провайдера заполнены не полностью или некорректно");
  }

  if (parsed.data.provider === "mock") {
    return new MockStudyPlanProvider();
  }

  return new YandexStudyPlanProvider({
    apiKey: parsed.data.apiKey,
    folderId: parsed.data.folderId,
    model: parsed.data.model,
    timeoutMs: parsed.data.timeoutMs,
    fetchImpl,
  });
}
