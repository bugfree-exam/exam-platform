export type PracticeFeedbackStageValue = "HINT" | "SOLUTION";

export function getPracticeFeedbackStage(input: {
  isCorrect: boolean;
  priorAttemptsOnTask: number;
}): PracticeFeedbackStageValue {
  return input.isCorrect || input.priorAttemptsOnTask > 0
    ? "SOLUTION"
    : "HINT";
}

export function canRevealPracticeSolution(
  stage: PracticeFeedbackStageValue
) {
  return stage === "SOLUTION";
}
