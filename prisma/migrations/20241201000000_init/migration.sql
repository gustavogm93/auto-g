-- CreateEnum
CREATE TYPE "GitHubStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('pending', 'in_process', 'end');

-- CreateEnum
CREATE TYPE "ServiceContext" AS ENUM ('checkout_api', 'transparent_checkout', 'buyer3', 'service_payment_request', 'QA_merchant');

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "github_number" INTEGER NOT NULL,
    "repository" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status_github" "GitHubStatus" NOT NULL DEFAULT 'open',
    "workflow_status" "WorkflowStatus" NOT NULL DEFAULT 'pending',
    "url" TEXT NOT NULL,
    "labels" JSONB DEFAULT '[]',
    "created_at_github" TIMESTAMP(3) NOT NULL,
    "updated_at_github" TIMESTAMP(3) NOT NULL,
    "selected_context" "ServiceContext",
    "prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issues_github_number_repository_key" ON "issues"("github_number", "repository");
