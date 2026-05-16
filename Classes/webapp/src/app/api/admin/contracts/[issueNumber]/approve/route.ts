import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import { approveContract } from "@/lib/github";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ issueNumber: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, repo, session } = ctx;
  const username = session.user.githubUsername;

  if (!isTeacher(username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { issueNumber } = await params;
  const num = parseInt(issueNumber, 10);

  if (isNaN(num)) {
    return NextResponse.json(
      { error: "Invalid issue number" },
      { status: 400 }
    );
  }

  try {
    await approveContract(octokit, owner, repo, num);
    return NextResponse.json({ success: true, issueNumber: num });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to approve contract" },
      { status: 500 }
    );
  }
}
