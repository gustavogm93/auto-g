import { PrismaClient, GitHubStatus, WorkflowStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample issues for testing
  const sampleIssues = [
    {
      githubNumber: 1,
      repository: 'clip-money/cnp-checkout-monorepo',
      title: '[Feature] Add payment validation',
      description: 'Implement validation for payment amounts before processing',
      statusGithub: GitHubStatus.open,
      workflowStatus: WorkflowStatus.pending,
      url: 'https://github.com/clip-money/cnp-checkout-monorepo/issues/1',
      labels: ['feature', 'payment'],
      createdAtGithub: new Date('2024-12-01'),
      updatedAtGithub: new Date('2024-12-01'),
    },
    {
      githubNumber: 2,
      repository: 'clip-money/cnp-checkout-monorepo',
      title: '[Bug] Fix session timeout',
      description: 'Session expires too quickly on mobile devices',
      statusGithub: GitHubStatus.open,
      workflowStatus: WorkflowStatus.in_process,
      url: 'https://github.com/clip-money/cnp-checkout-monorepo/issues/2',
      labels: ['bug', 'mobile'],
      createdAtGithub: new Date('2024-11-28'),
      updatedAtGithub: new Date('2024-12-02'),
    },
    {
      githubNumber: 3,
      repository: 'clip-money/checkout-api',
      title: '[Refactor] Improve error handling',
      description: 'Refactor error handling to use centralized error codes',
      statusGithub: GitHubStatus.closed,
      workflowStatus: WorkflowStatus.end,
      url: 'https://github.com/clip-money/checkout-api/issues/3',
      labels: ['refactor'],
      createdAtGithub: new Date('2024-11-20'),
      updatedAtGithub: new Date('2024-11-30'),
    },
  ]

  for (const issue of sampleIssues) {
    await prisma.issue.upsert({
      where: {
        githubNumber_repository: {
          githubNumber: issue.githubNumber,
          repository: issue.repository,
        },
      },
      update: issue,
      create: issue,
    })
  }

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
