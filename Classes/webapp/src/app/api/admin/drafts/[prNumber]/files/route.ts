import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, updateDraftFile } from "@/lib/github";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ prNumber: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const prNumber = parseInt(resolvedParams.prNumber, 10);
  if (isNaN(prNumber)) {
    return NextResponse.json({ error: "Invalid PR number" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { branch, path, content, sha } = body;
  
  if (!branch || !path || content === undefined || !sha) {
    return NextResponse.json(
      { error: "Missing required fields: branch, path, content, sha" },
      { status: 400 }
    );
  }

  const octokit = createOctokit(session.accessToken);
  const owner = process.env.NEXT_PUBLIC_GITHUB_ORG || "TheOpenFrontier";
  const repo = "gitClasses";

  try {
    await updateDraftFile(octokit, owner, repo, branch, path, content, sha);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update draft file" },
      { status: 500 }
    );
  }
}
