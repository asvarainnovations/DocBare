/*
  Warnings:

  - You are about to drop the column `slug` on the `BlogPost` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "BlogPost_slug_key";

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "slug";
