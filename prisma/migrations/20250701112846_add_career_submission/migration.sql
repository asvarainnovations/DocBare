-- CreateTable
CREATE TABLE "CareerSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "linkedin" TEXT,
    "portfolio" TEXT,
    "cover" TEXT,
    "resumeUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerSubmission_pkey" PRIMARY KEY ("id")
);
