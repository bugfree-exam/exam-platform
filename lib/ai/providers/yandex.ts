import type { StudentLearningAnalytics } from "../types";
import type { StudyPlanProvider } from "./provider";
import { OpenAiCompatibleStudyPlanProvider } from "./openAiCompatible";

const YANDEX_AI_API_BASE_URL = "https://ai.api.cloud.yandex.net/v1";
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_-]+$/;
const SAFE_MODEL_PATH = /^[a-zA-Z0-9._/-]+$/;

export type YandexStudyPlanProviderOptions = {
  apiKey: string;
  folderId: string;
  model: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class YandexStudyPlanProvider implements StudyPlanProvider {
  readonly name: string;
  private readonly transport: OpenAiCompatibleStudyPlanProvider;

  constructor(options: YandexStudyPlanProviderOptions) {
    if (!SAFE_IDENTIFIER.test(options.folderId)) {
      throw new Error("YANDEX_FOLDER_ID имеет некорректный формат");
    }
    if (!SAFE_MODEL_PATH.test(options.model) || options.model.startsWith("/")) {
      throw new Error("YANDEX_AI_MODEL имеет некорректный формат");
    }

    this.name = `yandex:${options.model}`;
    this.transport = new OpenAiCompatibleStudyPlanProvider({
      apiBaseUrl: YANDEX_AI_API_BASE_URL,
      apiKey: options.apiKey,
      model: `gpt://${options.folderId}/${options.model}`,
      providerName: this.name,
      extraHeaders: {
        "OpenAI-Project": options.folderId,
        "x-data-logging-enabled": "false",
      },
      timeoutMs: options.timeoutMs,
      fetchImpl: options.fetchImpl,
    });
  }

  async generatePlan(analytics: StudentLearningAnalytics) {
    return this.transport.generatePlan(analytics);
  }
}
