import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import { distributeAssignment } from "@/lib/github";
import { db } from "@/lib/db";

/**
 * POST — Distribute an assignment to one or more students.
 * Creates repos from the template and adds students as collaborators.
 *
 * Body: { usernames: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTeacher(ctx.session.user.githubUsername)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = db.getAssignment(slug);
  if (!assignment) {
    return NextResponse.json(
      { error: `Assignment "${slug}" not found` },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { usernames } = body as { usernames?: string[] };

  if (!usernames || usernames.length === 0) {
    return NextResponse.json(
      { error: "usernames array is required" },
      { status: 400 }
    );
  }

  // Parse template repo (format: "owner/repo")
  const [templateOwner, templateRepo] = assignment.template_repo.split("/");
  if (!templateOwner || !templateRepo) {
    return NextResponse.json(
      { error: "Invalid template_repo format. Expected 'owner/repo'" },
      { status: 500 }
    );
  }

  const results: {
    username: string;
    success: boolean;
    repoFullName?: string;
    error?: string;
  }[] = [];

  for (const username of usernames) {
    // Skip if already distributed
    const existing = db.getStudentRepo(assignment.id, username);
    if (existing) {
      results.push({
        username,
        success: true,
        repoFullName: existing.repo_full_name,
        error: "Already distributed",
      });
      continue;
    }

    try {
      const result = await distributeAssignment(
        ctx.octokit,
        templateOwner,
        templateRepo,
        ctx.owner,
        username,
        slug
      );

      // Record in DB
      db.upsertStudent({ username });
      db.createStudentRepo(assignment.id, username, result.repoFullName);

      results.push({
        username,
        success: true,
        repoFullName: result.repoFullName,
      });
    } catch (e: unknown) {
      results.push({
        username,
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    distributed: succeeded,
    failed,
    results,
  });
}
