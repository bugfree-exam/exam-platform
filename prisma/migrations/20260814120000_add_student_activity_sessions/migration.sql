CREATE TABLE "StudentActivitySession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "browserSessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPath" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentActivitySession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentActivitySession_browserSessionId_key"
ON "StudentActivitySession"("browserSessionId");

CREATE INDEX "StudentActivitySession_studentId_startedAt_idx"
ON "StudentActivitySession"("studentId", "startedAt");

CREATE INDEX "StudentActivitySession_studentId_lastSeenAt_idx"
ON "StudentActivitySession"("studentId", "lastSeenAt");

ALTER TABLE "StudentActivitySession"
ADD CONSTRAINT "StudentActivitySession_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
