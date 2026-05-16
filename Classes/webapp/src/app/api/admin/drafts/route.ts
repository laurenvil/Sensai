import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, listDraftModules } from "@/lib/github";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const octokit = createOctokit(session.accessToken);
  const owner = process.env.NEXT_PUBLIC_GITHUB_ORG || "TheOpenFrontier";
  const repo = "gitClasses";

  try {
    const drafts = await listDraftModules(octokit, owner, repo);
    return NextResponse.json(drafts);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}
