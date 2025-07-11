-- CreateTable
CREATE TABLE "RagQueryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunkMetadata" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "title" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunkMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunkMetadata_chunkId_key" ON "DocumentChunkMetadata"("chunkId");
