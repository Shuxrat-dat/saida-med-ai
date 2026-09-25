-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "responseTimeMs" INTEGER,
ADD COLUMN     "userAnswerText" TEXT;

-- AlterTable
ALTER TABLE "TopicPerformance" ADD COLUMN     "lastStudiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "masteryLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streakCorrect" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "TopicPerformance_userId_nextReviewAt_idx" ON "TopicPerformance"("userId", "nextReviewAt");
