import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const repository = searchParams.get("repository");
    const workflowStatus = searchParams.get("workflowStatus");
    const statusGithub = searchParams.get("statusGithub");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (repository) {
      where.repository = repository;
    }

    if (
      workflowStatus &&
      ["pending", "in_process", "end"].includes(workflowStatus)
    ) {
      where.workflowStatus = workflowStatus;
    }

    if (statusGithub && ["open", "closed"].includes(statusGithub)) {
      where.statusGithub = statusGithub;
    }

    // Get total count for pagination
    const total = await prisma.issue.count({ where });

    // Get issues
    const issues = await prisma.issue.findMany({
      where,
      orderBy: [{ workflowStatus: "asc" }, { updatedAtGithub: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues" },
      { status: 500 }
    );
  }
}
