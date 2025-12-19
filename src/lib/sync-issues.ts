import { prisma } from './prisma'
import { GitHubStatus, WorkflowStatus } from '@prisma/client'

interface GitHubIssue {
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  labels: Array<{ name: string }>
  created_at: string
  updated_at: string
  repository_url: string
}

interface SyncResult {
  created: number
  updated: number
  errors: string[]
}

/**
 * Extract repository name from GitHub API repository URL
 * e.g., "https://api.github.com/repos/owner/repo" -> "owner/repo"
 */
function extractRepoFromUrl(repoUrl: string): string {
  const match = repoUrl.match(/repos\/(.+)$/)
  return match ? match[1] : repoUrl
}

/**
 * Fetch issues from a single GitHub repository
 */
async function fetchIssuesFromRepo(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubIssue[]> {
  const issues: GitHubIssue[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${perPage}&page=${page}`
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const data: GitHubIssue[] = await response.json()
    
    // Filter out pull requests (they also appear in the issues endpoint)
    const issuesOnly = data.filter((item) => !('pull_request' in item))
    issues.push(...issuesOnly)

    if (data.length < perPage) {
      break
    }
    page++
  }

  return issues
}

/**
 * Sync a single issue from GitHub to the database
 */
async function syncIssue(
  issue: GitHubIssue,
  repository: string
): Promise<'created' | 'updated'> {
  const githubStatus: GitHubStatus = issue.state === 'open' ? 'open' : 'closed'
  const labels = issue.labels.map((l) => l.name)

  // Check if issue exists
  const existing = await prisma.issue.findUnique({
    where: {
      githubNumber_repository: {
        githubNumber: issue.number,
        repository,
      },
    },
  })

  if (!existing) {
    // Create new issue
    const workflowStatus: WorkflowStatus = githubStatus === 'closed' ? 'end' : 'pending'

    await prisma.issue.create({
      data: {
        githubNumber: issue.number,
        repository,
        title: issue.title,
        description: issue.body,
        statusGithub: githubStatus,
        workflowStatus,
        url: issue.html_url,
        labels,
        createdAtGithub: new Date(issue.created_at),
        updatedAtGithub: new Date(issue.updated_at),
      },
    })

    return 'created'
  }

  // Update existing issue
  let newWorkflowStatus = existing.workflowStatus

  // Rule: if GitHub says closed, force workflow_status = end
  if (githubStatus === 'closed') {
    newWorkflowStatus = 'end'
  }
  // If it was end but now open again, reset to pending
  else if (existing.statusGithub === 'closed' && githubStatus === 'open') {
    newWorkflowStatus = 'pending'
  }
  // Otherwise, keep the existing workflow status

  await prisma.issue.update({
    where: { id: existing.id },
    data: {
      title: issue.title,
      description: issue.body,
      statusGithub: githubStatus,
      workflowStatus: newWorkflowStatus,
      url: issue.html_url,
      labels,
      updatedAtGithub: new Date(issue.updated_at),
    },
  })

  return 'updated'
}

/**
 * Main sync function - fetches issues from configured repos and syncs to DB
 */
export async function syncIssuesFromGitHub(): Promise<SyncResult> {
  const token = process.env.GH_TOKEN
  const reposConfig = process.env.GH_REPOS

  if (!token) {
    throw new Error('GH_TOKEN environment variable is not set')
  }

  if (!reposConfig) {
    throw new Error('GH_REPOS environment variable is not set')
  }

  const repos = reposConfig.split(',').map((r) => r.trim())
  const result: SyncResult = { created: 0, updated: 0, errors: [] }

  for (const repo of repos) {
    const [owner, repoName] = repo.split('/')
    
    if (!owner || !repoName) {
      result.errors.push(`Invalid repo format: ${repo}`)
      continue
    }

    try {
      console.log(`🔄 Syncing ${repo}...`)
      const issues = await fetchIssuesFromRepo(owner, repoName, token)
      console.log(`   Found ${issues.length} issues`)

      for (const issue of issues) {
        try {
          const action = await syncIssue(issue, repo)
          if (action === 'created') result.created++
          else result.updated++
        } catch (err) {
          const msg = `Error syncing issue #${issue.number} from ${repo}: ${err instanceof Error ? err.message : 'Unknown error'}`
          console.error(msg)
          result.errors.push(msg)
        }
      }

      console.log(`   ✅ Synced ${repo}`)
    } catch (err) {
      const msg = `Error fetching issues from ${repo}: ${err instanceof Error ? err.message : 'Unknown error'}`
      console.error(msg)
      result.errors.push(msg)
    }
  }

  console.log(`\n📊 Sync complete: ${result.created} created, ${result.updated} updated`)
  if (result.errors.length > 0) {
    console.log(`⚠️  ${result.errors.length} errors occurred`)
  }

  return result
}

// Allow running as a standalone script
if (require.main === module) {
  syncIssuesFromGitHub()
    .then((result) => {
      console.log('Result:', result)
      process.exit(0)
    })
    .catch((err) => {
      console.error('Sync failed:', err)
      process.exit(1)
    })
}
