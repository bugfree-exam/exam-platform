import type { StudyPlanProvider } from "./provider";
import type { MasteryCategory, StudentLearningAnalytics } from "../types";

const categoryPriority: Record<MasteryCategory, number> = {
  CRITICAL_GAP: 0,
  PRACTICE: 1,
  CONSOLIDATE: 2,
  INSUFFICIENT_DATA: 3,
  MASTERED: 4,
};

const priorityByCategory: Record<MasteryCategory, "HIGH" | "MEDIUM" | "LOW"> = {
  CRITICAL_GAP: "HIGH",
  PRACTICE: "HIGH",
  CONSOLIDATE: "MEDIUM",
  INSUFFICIENT_DATA: "LOW",
  MASTERED: "LOW",
};

export class MockStudyPlanProvider implements StudyPlanProvider {
  constructor(readonly name = "mock") {}

  async generatePlan(analytics: StudentLearningAnalytics): Promise<unknown> {
    const selected = [...analytics.topics]
      .filter((topic) => topic.category !== "MASTERED")
      .sort(
        (a, b) =>
          categoryPriority[a.category] - categoryPriority[b.category] ||
          a.accuracy - b.accuracy ||
          a.egeNumber - b.egeNumber
      )
      .slice(0, 5);

    const topics = selected.length > 0 ? selected : analytics.topics.slice(0, 1);
    if (topics.length === 0) {
      return {
        title: "Нужно накопить статистику",
        summary: "Сначала решите несколько заданий, чтобы рекомендации опирались на реальные результаты.",
        durationDays: 1,
        topics: [{ egeNumber: 1, priority: "LOW", reason: "Пока недостаточно данных для выбора темы." }],
        actions: [{ day: 1, egeNumber: 1, taskCount: 3, goal: "Получить первые данные для диагностики." }],
      };
    }

    return {
      title: "Персональный план подготовки",
      summary: `План составлен по ${analytics.totalAnswers} ответам и фокусируется на темах, требующих внимания.`,
      durationDays: Math.min(14, Math.max(3, topics.length * 2)),
      topics: topics.map((topic) => ({
        egeNumber: topic.egeNumber,
        priority: priorityByCategory[topic.category],
        reason: `Точность ${topic.accuracy}%, текущая серия ошибок: ${topic.currentErrorStreak}.`,
      })),
      actions: topics.map((topic, index) => ({
        day: index * 2 + 1,
        egeNumber: topic.egeNumber,
        taskCount: topic.category === "CRITICAL_GAP" ? 8 : 5,
        goal: `Отработать задание №${topic.egeNumber} и проверить устойчивость результата.`,
      })),
    };
  }
}
