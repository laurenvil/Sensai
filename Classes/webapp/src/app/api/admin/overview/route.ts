import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import { db } from "@/lib/db";
import { listOrgMembers, listContractIssues } from "@/lib/github";
import type { ClassroomOverview } from "@/types";

export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, session } = ctx;
  const username = session.user.githubUsername;

  if (!isTeacher(username)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sync org members into DB
  const members = await listOrgMembers(octokit, owner);
  for (const m of members) {
    if (!isTeacher(m.login)) {
      db.upsertStudent({ username: m.login, avatarUrl: m.avatarUrl });
    }
  }

  // Also check GitHub for any contracts not yet in DB
  const ghContracts = await listContractIssues(octokit, owner, ctx.repo);
  for (const c of ghContracts) {
    db.upsertContract({
      username: c.username,
      issueNumber: c.number,
      moduleSlug: "module-01-basics",
      learningPath: c.learningPath,
      status: c.status,
    });
  }

  // Get stats from DB
  const freshStats = db.getClassroomStats();

  const overview: ClassroomOverview = {
    totalStudents: freshStats.totalStudents,
    contractsSubmitted: freshStats.contractStats.reduce((s, c) => s + c.c, 0),
    contractsApproved:
      freshStats.contractStats.find((c) => c.status === "approved")?.c || 0,
    averageScore: freshStats.avgScore,
    moduleCompletionRates: {},
  };

  // Get pending contracts for the approval queue
  const pendingContracts = db.listContracts("pending").map((c) => ({
    number: c.issue_number,
    username: c.username,
    learningPath: c.learning_path,
    createdAt: c.created_at,
  }));

  return NextResponse.json({ overview, pendingContracts });
}
