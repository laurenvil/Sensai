import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOctokit, getDraftModuleDetails, mergeDraftModule } from "@/lib/github";

export async function GET(
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

  const octokit = createOctokit(session.accessToken);
  const owner = process.env.NEXT_PUBLIC_GITHUB_ORG || "TheOpenFrontier";
  const repo = "gitClasses";

  try {
    const details = await getDraftModuleDetails(octokit, owner, repo, prNumber);
    if (!details) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch draft details" },
      { status: 500 }
    );
  }
}

export async function POST(
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

  const octokit = createOctokit(session.accessToken);
  const owner = process.env.NEXT_PUBLIC_GITHUB_ORG || "TheOpenFrontier";
  const repo = "gitClasses";

  try {
    await mergeDraftModule(octokit, owner, repo, prNumber);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to merge draft" },
      { status: 500 }
    );
  }
}
