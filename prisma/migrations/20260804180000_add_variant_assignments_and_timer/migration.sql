-- AlterTable
ALTER TABLE "VariantAttempt"
ADD COLUMN "timerEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "VariantAssignment" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantAssignment_variantId_studentId_key"
ON "VariantAssignment"("variantId", "studentId");

-- CreateIndex
CREATE INDEX "VariantAssignment_studentId_assignedAt_idx"
ON "VariantAssignment"("studentId", "assignedAt");

-- CreateIndex
CREATE INDEX "VariantAssignment_variantId_idx"
ON "VariantAssignment"("variantId");

-- AddForeignKey
ALTER TABLE "VariantAssignment"
ADD CONSTRAINT "VariantAssignment_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAssignment"
ADD CONSTRAINT "VariantAssignment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
