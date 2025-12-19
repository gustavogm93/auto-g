import { prisma } from "@/lib/prisma";
import { WorkflowStatus } from "@prisma/client";
import { NextResponse } from "next/server";

interface StartRequestBody {
  selectedContext: string;
  prompt?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: StartRequestBody = await request.json();

    // Validate selectedContext is provided
    if (!body.selectedContext || typeof body.selectedContext !== "string") {
      return NextResponse.json(
        { error: "selectedContext is required" },
        { status: 400 }
      );
    }

    // Find the issue first
    const existingIssue = await prisma.issue.findUnique({
      where: { id },
    });

    if (!existingIssue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    // Only allow starting if issue is open on GitHub
    if (existingIssue.statusGithub !== "open") {
      return NextResponse.json(
        { error: "Cannot start a closed issue" },
        { status: 400 }
      );
    }

    // Only allow starting if workflow is pending
    if (existingIssue.workflowStatus !== "pending") {
      return NextResponse.json(
        { error: "Issue is already in process or ended" },
        { status: 400 }
      );
    }

    // Update the issue
    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: {
        selectedContext: body.selectedContext,
        prompt: body.prompt || null,
        workflowStatus: WorkflowStatus.in_process,
      },
    });

    return NextResponse.json(updatedIssue);
  } catch (error) {
    console.error("Error starting issue:", error);
    return NextResponse.json(
      { error: "Failed to start issue" },
      { status: 500 }
    );
  }
}
