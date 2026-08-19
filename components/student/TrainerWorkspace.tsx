"use client";

import { type ReactNode, useState } from "react";

import { StudentSolutionEditor } from "@/components/student/StudentSolutionEditor";
import {
  TrainerTaskSolver,
  type TrainerAnswerType,
  type TrainerStudyPlanContext,
} from "@/components/student/TrainerTaskSolver";

type FeedbackStage = "HINT" | "SOLUTION";

export function TrainerWorkspace({
  children,
  taskId,
  taskRevisionId,
  egeNumber,
  answerType,
  studyPlanContext,
}: {
  children: ReactNode;
  taskId: string;
  taskRevisionId: string;
  egeNumber: number;
  answerType: TrainerAnswerType;
  studyPlanContext?: TrainerStudyPlanContext;
}) {
  const [feedbackStage, setFeedbackStage] = useState<FeedbackStage | null>(null);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {children}

      <TrainerTaskSolver
        taskId={taskId}
        egeNumber={egeNumber}
        answerType={answerType}
        studyPlanContext={studyPlanContext}
        onFeedbackStageChange={setFeedbackStage}
      />

      {feedbackStage ? (
        <div className="min-w-0 lg:col-span-2">
          <StudentSolutionEditor
            taskId={taskId}
            taskRevisionId={taskRevisionId}
            canViewPeerSolutions={feedbackStage === "SOLUTION"}
          />
        </div>
      ) : null}
    </div>
  );
}
