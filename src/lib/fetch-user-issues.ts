import { GitHubStatus, WorkflowStatus } from "@prisma/client";
import { prisma } from "./prisma";

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  repository_url: string;
}

interface FetchResult {
  issues: GitHubIssue[];
  total: number;
  errors: string[];
}

/**
 * Extract repository full name from GitHub API repository URL
 * e.g., "https://api.github.com/repos/ClipMX/cnp-checkout-monorepo" -> "ClipMX/cnp-checkout-monorepo"
 */
function extractRepoFromUrl(repoUrl: string): string {
  const match = repoUrl.match(/repos\/(.+)$/);
  return match ? match[1] : repoUrl;
}

/**
 * Fetch issues assigned to a specific user using GitHub Search API
 */
export async function fetchUserAssignedIssues(
  username: string,
  token: string
): Promise<FetchResult> {
  const result: FetchResult = { issues: [], total: 0, errors: [] };

  try {
    // Use GitHub Search API to find issues assigned to the user
    const query = encodeURIComponent(`assignee:${username} is:issue is:open`);
    const url = `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=100`;

    console.log(`🔍 Searching issues assigned to ${username}...`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    // Filter out pull requests (they also appear in search results)
    const issuesOnly = data.items.filter((item: any) => !item.pull_request);

    result.issues = issuesOnly;
    result.total = issuesOnly.length;

    console.log(`   ✅ Found ${result.total} issues assigned to ${username}`);

    // Log each issue for debugging
    for (const issue of issuesOnly) {
      const repo = extractRepoFromUrl(issue.repository_url);
      console.log(`   - #${issue.number}: ${issue.title} (${repo})`);
    }
  } catch (err) {
    const msg = `Error fetching issues for user ${username}: ${err instanceof Error ? err.message : "Unknown error"}`;
    console.error(msg);
    result.errors.push(msg);
  }

  return result;
}

/**
 * Sync user assigned issues to the database
 */
export async function syncUserAssignedIssues(username: string): Promise<{
  created: number;
  updated: number;
  issues: any[];
  errors: string[];
}> {
  const token = process.env.GH_TOKEN;

  if (!token) {
    throw new Error("GH_TOKEN environment variable is not set");
  }

  const fetchResult = await fetchUserAssignedIssues(username, token);

  const syncResult = {
    created: 0,
    updated: 0,
    issues: [] as any[],
    errors: fetchResult.errors,
  };

  for (const issue of fetchResult.issues) {
    const repository = extractRepoFromUrl(issue.repository_url);
    const githubStatus: GitHubStatus =
      issue.state === "open" ? "open" : "closed";
    const labels = issue.labels.map((l: any) => l.name);

    try {
      // Check if issue exists
      const existing = await prisma.issue.findUnique({
        where: {
          githubNumber_repository: {
            githubNumber: issue.number,
            repository,
          },
        },
      });

      if (!existing) {
        // Create new issue
        const workflowStatus: WorkflowStatus =
          githubStatus === "closed" ? "end" : "pending";

        const created = await prisma.issue.create({
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
        });

        syncResult.created++;
        syncResult.issues.push(created);
      } else {
        // Update existing issue
        let newWorkflowStatus = existing.workflowStatus;

        if (githubStatus === "closed") {
          newWorkflowStatus = "end";
        } else if (
          existing.statusGithub === "closed" &&
          githubStatus === "open"
        ) {
          newWorkflowStatus = "pending";
        }

        const updated = await prisma.issue.update({
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
        });

        syncResult.updated++;
        syncResult.issues.push(updated);
      }
    } catch (err) {
      const msg = `Error syncing issue #${issue.number} from ${repository}: ${err instanceof Error ? err.message : "Unknown error"}`;
      console.error(msg);
      syncResult.errors.push(msg);
    }
  }

  console.log(
    `\n📊 Sync complete: ${syncResult.created} created, ${syncResult.updated} updated`
  );
  if (syncResult.errors.length > 0) {
    console.log(`⚠️  ${syncResult.errors.length} errors occurred`);
  }

  return syncResult;
}

// Allow running as a standalone script
if (require.main === module) {
  const username = process.argv[2] || "ggarciaclip";

  console.log(`\n🚀 Fetching issues assigned to: ${username}\n`);

  syncUserAssignedIssues(username)
    .then((result) => {
      console.log("\n📋 Result:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Sync failed:", err);
      process.exit(1);
    });
}
