-- Track that a student opened a published webinar page. This records access,
-- not guaranteed video completion inside an external player.

CREATE TABLE "WebinarView" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "WebinarView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebinarView_studentId_webinarId_key" ON "WebinarView"("studentId", "webinarId");
CREATE INDEX "WebinarView_studentId_lastViewedAt_idx" ON "WebinarView"("studentId", "lastViewedAt");
CREATE INDEX "WebinarView_webinarId_lastViewedAt_idx" ON "WebinarView"("webinarId", "lastViewedAt");

ALTER TABLE "WebinarView" ADD CONSTRAINT "WebinarView_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebinarView" ADD CONSTRAINT "WebinarView_webinarId_fkey" FOREIGN KEY ("webinarId") REFERENCES "Webinar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
