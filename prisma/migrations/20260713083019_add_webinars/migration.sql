-- CreateEnum
CREATE TYPE "WebinarVideoProvider" AS ENUM ('RUTUBE', 'YANDEX_DISK', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "WebinarStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WebinarMaterialType" AS ENUM ('LINK', 'CHEATSHEET', 'PRESENTATION', 'DOCUMENT', 'CODE', 'OTHER');

-- CreateTable
CREATE TABLE "Webinar" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentHtml" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoEmbedUrl" TEXT,
    "videoProvider" "WebinarVideoProvider" NOT NULL DEFAULT 'RUTUBE',
    "status" "WebinarStatus" NOT NULL DEFAULT 'DRAFT',
    "eventDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webinar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarMaterial" (
    "id" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "WebinarMaterialType" NOT NULL DEFAULT 'LINK',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebinarMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Webinar_status_idx" ON "Webinar"("status");

-- CreateIndex
CREATE INDEX "Webinar_eventDate_idx" ON "Webinar"("eventDate");

-- CreateIndex
CREATE INDEX "WebinarMaterial_webinarId_idx" ON "WebinarMaterial"("webinarId");

-- AddForeignKey
ALTER TABLE "WebinarMaterial" ADD CONSTRAINT "WebinarMaterial_webinarId_fkey" FOREIGN KEY ("webinarId") REFERENCES "Webinar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
