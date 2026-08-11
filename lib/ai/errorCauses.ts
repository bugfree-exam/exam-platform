export const LEARNING_ERROR_CAUSES = [
  "THEORY_GAP",
  "ALGORITHM_GAP",
  "IMPLEMENTATION_ERROR",
  "CONDITION_READING",
  "CALCULATION_ERROR",
  "NO_CHECKING",
  "TIME_PRESSURE",
  "OTHER",
] as const;

export type LearningErrorCauseValue = (typeof LEARNING_ERROR_CAUSES)[number];

export const learningErrorCauseLabels: Record<LearningErrorCauseValue, string> = {
  THEORY_GAP: "Не понял теорию",
  ALGORITHM_GAP: "Не знал или перепутал алгоритм",
  IMPLEMENTATION_ERROR: "Ошибся в реализации или коде",
  CONDITION_READING: "Неправильно прочитал условие",
  CALCULATION_ERROR: "Арифметическая или техническая ошибка",
  NO_CHECKING: "Не проверил ответ",
  TIME_PRESSURE: "Не уложился по времени или торопился",
  OTHER: "Другая причина",
};
