-- Existing active tasks become available in the public bank.
ALTER TABLE "Task"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- Incrementing this value revokes all previously issued JWTs for a user.
ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Task_isPublic_isArchived_egeNumber_idx"
ON "Task"("isPublic", "isArchived", "egeNumber");
