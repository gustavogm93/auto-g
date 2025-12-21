/**
 * Service to fetch data from a GitHub Pull Request
 * Divided into separate functions for different data types:
 * - fetchPRMetadata: PR info (state, title, branch, stats)
 * - fetchPRComments: All types of comments
 * - fetchPRFiles: Changed files with diffs
 */

// ============================================
// TYPES
// ============================================

interface PRAuthor {
  login: string
  avatar_url: string
  html_url: string
}

interface PRLabel {
  name: string
  color: string
}

// PR Metadata (without file changes)
export interface PRMetadata {
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  merged: boolean
  draft: boolean
  html_url: string
  user: PRAuthor
  labels: PRLabel[]
  created_at: string
  updated_at: string
  merged_at: string | null
  closed_at: string | null
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
  // Stats only, not actual changes
  additions: number
  deletions: number
  changed_files: number
  commits: number
}

// Issue comment (general PR comments)
export interface IssueComment {
  id: number
  user: PRAuthor
  body: string
  created_at: string
  updated_at: string
  html_url: string
}

// Review comment (comment on specific code line)
export interface ReviewComment {
  id: number
  user: PRAuthor
  body: string
  path: string
  line: number | null
  original_line: number | null
  diff_hunk: string
  created_at: string
  updated_at: string
  html_url: string
  in_reply_to_id?: number
}

// Review (approval, changes requested, etc.)
export interface Review {
  id: number
  user: PRAuthor
  body: string | null
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  submitted_at: string
  html_url: string
}

// All comments combined
export interface PRComments {
  issueComments: IssueComment[]
  reviewComments: ReviewComment[]
  reviews: Review[]
}

// File change info
export interface PRFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  additions: number
  deletions: number
  changes: number
  patch?: string  // The actual diff
  previous_filename?: string  // For renamed files
}

export interface PRFiles {
  files: PRFile[]
  totalAdditions: number
  totalDeletions: number
  totalChanges: number
}

// Helper to get headers
function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// ============================================
// 1. FETCH PR METADATA (state, title, branch, stats)
// ============================================

export async function fetchPRMetadata(
  service: string,
  prNumber: number,
  owner: string = 'ClipMX',
  token?: string
): Promise<{ success: boolean; data: PRMetadata | null; error?: string }> {
  const ghToken = token || process.env.GH_TOKEN

  if (!ghToken) {
    return { success: false, data: null, error: 'GH_TOKEN not set' }
  }

  const url = `https://api.github.com/repos/${owner}/${service}/pulls/${prNumber}`

  try {
    console.log(`\n📄 Fetching PR #${prNumber} metadata from ${owner}/${service}...`)
    
    const response = await fetch(url, { headers: getHeaders(ghToken) })
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }
    
    const pr = await response.json()
    
    const metadata: PRMetadata = {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      merged: pr.merged,
      draft: pr.draft,
      html_url: pr.html_url,
      user: {
        login: pr.user.login,
        avatar_url: pr.user.avatar_url,
        html_url: pr.user.html_url,
      },
      labels: pr.labels.map((l: any) => ({ name: l.name, color: l.color })),
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at,
      closed_at: pr.closed_at,
      head: { ref: pr.head.ref, sha: pr.head.sha },
      base: { ref: pr.base.ref, sha: pr.base.sha },
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
      commits: pr.commits,
    }

    console.log(`   ✅ "${metadata.title}"`)
    console.log(`   State: ${metadata.state}${metadata.merged ? ' (merged)' : ''}${metadata.draft ? ' (draft)' : ''}`)
    console.log(`   Branch: ${metadata.head.ref} → ${metadata.base.ref}`)
    console.log(`   Stats: +${metadata.additions} -${metadata.deletions} in ${metadata.changed_files} files`)

    return { success: true, data: metadata }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error(`   ❌ Error: ${error}`)
    return { success: false, data: null, error }
  }
}

// ============================================
// 2. FETCH PR COMMENTS (issue comments, review comments, reviews)
// ============================================

export async function fetchPRComments(
  service: string,
  prNumber: number,
  owner: string = 'ClipMX',
  token?: string
): Promise<{ success: boolean; data: PRComments | null; error?: string }> {
  const ghToken = token || process.env.GH_TOKEN

  if (!ghToken) {
    return { success: false, data: null, error: 'GH_TOKEN not set' }
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${service}`
  const headers = getHeaders(ghToken)

  try {
    console.log(`\n💬 Fetching comments for PR #${prNumber}...`)

    // Fetch all three types in parallel
    const [issueCommentsRes, reviewCommentsRes, reviewsRes] = await Promise.all([
      fetch(`${baseUrl}/issues/${prNumber}/comments?per_page=100`, { headers }),
      fetch(`${baseUrl}/pulls/${prNumber}/comments?per_page=100`, { headers }),
      fetch(`${baseUrl}/pulls/${prNumber}/reviews?per_page=100`, { headers }),
    ])

    const issueComments: IssueComment[] = issueCommentsRes.ok 
      ? (await issueCommentsRes.json()).map((c: any) => ({
          id: c.id,
          user: { login: c.user.login, avatar_url: c.user.avatar_url, html_url: c.user.html_url },
          body: c.body,
          created_at: c.created_at,
          updated_at: c.updated_at,
          html_url: c.html_url,
        }))
      : []

    const reviewComments: ReviewComment[] = reviewCommentsRes.ok 
      ? (await reviewCommentsRes.json()).map((c: any) => ({
          id: c.id,
          user: { login: c.user.login, avatar_url: c.user.avatar_url, html_url: c.user.html_url },
          body: c.body,
          path: c.path,
          line: c.line,
          original_line: c.original_line,
          diff_hunk: c.diff_hunk,
          created_at: c.created_at,
          updated_at: c.updated_at,
          html_url: c.html_url,
          in_reply_to_id: c.in_reply_to_id,
        }))
      : []

    const reviews: Review[] = reviewsRes.ok 
      ? (await reviewsRes.json()).map((r: any) => ({
          id: r.id,
          user: { login: r.user.login, avatar_url: r.user.avatar_url, html_url: r.user.html_url },
          body: r.body,
          state: r.state,
          submitted_at: r.submitted_at,
          html_url: r.html_url,
        }))
      : []

    console.log(`   ✅ Issue comments: ${issueComments.length}`)
    console.log(`   ✅ Review comments: ${reviewComments.length}`)
    console.log(`   ✅ Reviews: ${reviews.length}`)

    return {
      success: true,
      data: { issueComments, reviewComments, reviews },
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error(`   ❌ Error: ${error}`)
    return { success: false, data: null, error }
  }
}

// ============================================
// 3. FETCH PR FILES (changed files with diffs)
// ============================================

export async function fetchPRFiles(
  service: string,
  prNumber: number,
  owner: string = 'ClipMX',
  token?: string
): Promise<{ success: boolean; data: PRFiles | null; error?: string }> {
  const ghToken = token || process.env.GH_TOKEN

  if (!ghToken) {
    return { success: false, data: null, error: 'GH_TOKEN not set' }
  }

  const url = `https://api.github.com/repos/${owner}/${service}/pulls/${prNumber}/files?per_page=100`

  try {
    console.log(`\n📁 Fetching files for PR #${prNumber}...`)
    
    const response = await fetch(url, { headers: getHeaders(ghToken) })
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }
    
    const filesData = await response.json()
    
    const files: PRFile[] = filesData.map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
      previous_filename: f.previous_filename,
    }))

    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0)
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0)
    const totalChanges = files.reduce((sum, f) => sum + f.changes, 0)

    console.log(`   ✅ ${files.length} files changed`)
    console.log(`   +${totalAdditions} -${totalDeletions} (${totalChanges} total changes)`)
    
    // List files
    for (const file of files) {
      const icon = file.status === 'added' ? '🟢' : file.status === 'removed' ? '🔴' : '🟡'
      console.log(`   ${icon} ${file.filename} (+${file.additions} -${file.deletions})`)
    }

    return {
      success: true,
      data: { files, totalAdditions, totalDeletions, totalChanges },
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error(`   ❌ Error: ${error}`)
    return { success: false, data: null, error }
  }
}

// ============================================
// CONVENIENCE: FETCH ALL PR DATA
// ============================================

export async function fetchAllPRData(
  service: string,
  prNumber: number,
  owner: string = 'ClipMX',
  token?: string
) {
  const [metadata, comments, files] = await Promise.all([
    fetchPRMetadata(service, prNumber, owner, token),
    fetchPRComments(service, prNumber, owner, token),
    fetchPRFiles(service, prNumber, owner, token),
  ])

  return {
    success: metadata.success && comments.success && files.success,
    metadata: metadata.data,
    comments: comments.data,
    files: files.data,
    errors: [
      metadata.error,
      comments.error,
      files.error,
    ].filter(Boolean),
  }
}

// ============================================
// CLI RUNNER
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]
  const service = args[1]
  const prNumber = parseInt(args[2], 10)

  const usage = `
Usage: npx tsx src/lib/fetch-pr-data.ts <command> <service> <pr-number>

Commands:
  metadata   - Fetch PR info (state, title, branch, stats)
  comments   - Fetch all comments (issue, review, reviews)
  files      - Fetch changed files with diffs
  all        - Fetch everything

Examples:
  npx tsx src/lib/fetch-pr-data.ts metadata checkout-api 123
  npx tsx src/lib/fetch-pr-data.ts comments checkout-api 123
  npx tsx src/lib/fetch-pr-data.ts files checkout-api 123
  npx tsx src/lib/fetch-pr-data.ts all checkout-api 123
`

  if (!command || !service || isNaN(prNumber)) {
    console.log(usage)
    process.exit(1)
  }

  const run = async () => {
    let result: any

    switch (command) {
      case 'metadata':
        result = await fetchPRMetadata(service, prNumber)
        break
      case 'comments':
        result = await fetchPRComments(service, prNumber)
        break
      case 'files':
        result = await fetchPRFiles(service, prNumber)
        break
      case 'all':
        result = await fetchAllPRData(service, prNumber)
        break
      default:
        console.log(`Unknown command: ${command}`)
        console.log(usage)
        process.exit(1)
    }

    console.log('\n📋 Result:')
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.success ? 0 : 1)
  }

  run()
}
