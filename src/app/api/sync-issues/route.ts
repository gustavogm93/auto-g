import { syncUserAssignedIssues } from "@/lib/fetch-user-issues";
import { NextResponse } from "next/server";

// Default GitHub username to sync issues for
const DEFAULT_USERNAME = "ggarciaclip";

export async function POST(request: Request) {
  try {
    // Allow overriding username via query param or body
    const { searchParams } = new URL(request.url);
    let username = searchParams.get("username") || DEFAULT_USERNAME;

    // Try to get username from body if provided
    try {
      const body = await request.json();
      if (body.username) {
        username = body.username;
      }
    } catch {
      // No body or invalid JSON, use default/query param
    }

    const result = await syncUserAssignedIssues(username);

    return NextResponse.json({
      success: true,
      message: `Synced issues assigned to ${username}`,
      created: result.created,
      updated: result.updated,
      total: result.issues.length,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error syncing issues:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync issues",
      },
      { status: 500 }
    );
  }
}
