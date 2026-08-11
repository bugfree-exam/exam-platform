import type { StudyPlanStatus } from "@prisma/client";

export type StudyPlanAction = "CONFIRM" | "CANCEL";

export function getNextStudyPlanStatus(
  current: StudyPlanStatus,
  action: StudyPlanAction
): StudyPlanStatus {
  if (current === "CANCELLED") {
    throw new Error("Отменённый план нельзя изменить");
  }

  if (action === "CONFIRM") {
    if (current !== "DRAFT") {
      throw new Error("Подтвердить можно только черновик плана");
    }

    return "CONFIRMED";
  }

  return "CANCELLED";
}
