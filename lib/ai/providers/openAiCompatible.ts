import { parseStudentLearningAnalytics } from "../analyticsSchema";
import type { StudentLearningAnalytics } from "../types";
import type { StudyPlanProvider } from "./provider";

const MAX_RESPONSE_CHARACTERS = 50_000;

type FetchLike = typeof fetch;

export type OpenAiCompatibleProviderOptions = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  providerName?: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
};

const systemPrompt = `Ты методический AI-ассистент преподавателя ЕГЭ по информатике.
Составь краткий учебный план только по переданной обезличенной аналитике.
Не пытайся определить личность ученика и не добавляй персональные данные.
Верни только JSON-объект без markdown и пояснений вокруг него.

Строгая структура ответа:
{
  "title": "строка до 120 символов",
  "summary": "строка до 800 символов",
  "durationDays": "целое число от 1 до 14",
  "topics": [
    {
      "egeNumber": "целое число от 1 до 27",
      "priority": "HIGH | MEDIUM | LOW",
      "reason": "строка до 300 символов"
    }
  ],
  "actions": [
    {
      "day": "целое число от 1 до durationDays",
      "egeNumber": "номер из topics",
      "taskCount": "целое число от 1 до 20",
      "goal": "строка до 300 символов"
    }
  ]
}

Ограничения: не более 5 тем, не более 20 действий и не более 100 задач суммарно.`;

function normalizeBaseUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("AI_API_BASE_URL должен использовать HTTPS");
  }

  return url.toString().replace(/\/$/, "");
}

function readAssistantContent(candidate: unknown): string {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !("choices" in candidate) ||
    !Array.isArray(candidate.choices)
  ) {
    throw new Error("AI-провайдер вернул ответ неизвестного формата");
  }

  const firstChoice = candidate.choices[0];
  if (!firstChoice || typeof firstChoice !== "object" || !("message" in firstChoice)) {
    throw new Error("AI-провайдер не вернул сообщение");
  }

  const message = firstChoice.message;
  if (!message || typeof message !== "object" || !("content" in message)) {
    throw new Error("AI-провайдер не вернул содержимое сообщения");
  }

  if (typeof message.content !== "string" || message.content.length === 0) {
    throw new Error("AI-провайдер вернул пустой план");
  }

  if (message.content.length > MAX_RESPONSE_CHARACTERS) {
    throw new Error("Ответ AI-провайдера превышает безопасный размер");
  }

  return message.content;
}

export class OpenAiCompatibleStudyPlanProvider implements StudyPlanProvider {
  readonly name: string;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.endpoint = `${normalizeBaseUrl(options.apiBaseUrl)}/chat/completions`;
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.extraHeaders = options.extraHeaders ?? {};
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.name = options.providerName ?? `openai-compatible:${options.model}`;
  }

  async generatePlan(analytics: StudentLearningAnalytics): Promise<unknown> {
    const safeAnalytics = parseStudentLearningAnalytics(analytics);
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        ...this.extraHeaders,
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 1_800,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({ analytics: safeAnalytics }),
          },
        ],
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`AI-провайдер недоступен (HTTP ${response.status})`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("AI-провайдер вернул не JSON");
    }

    const content = readAssistantContent(payload);
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error("AI-провайдер вернул план не в формате JSON");
    }
  }
}
