import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher, env } from "@/lib/env";
import { db } from "@/lib/db";
import { getWorkflowRunsByActor } from "@/lib/github";
import { MODULE_META } from "@/lib/constants";
import type { StudentProgress, ModuleProgress } from "@/types";

export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, repo, session } = ctx;
  const username = session.user.githubUsername;

  // Ensure student exists in DB
  db.upsertStudent({
    username,
    name: session.user.name || undefined,
    avatarUrl: session.user.image || undefined,
  });

  // Try DB-backed grades first
  const dbGrades = db.getLatestGrades(username);
  const dbContract = db.getContractByUser(username);

  const moduleSlugs = Object.keys(MODULE_META);
  let modules: ModuleProgress[];

  if (dbGrades.length > 0) {
    // Use DB data
    modules = moduleSlugs.map((slug) => {
      const meta = MODULE_META[slug];
      const grade = dbGrades.find((g) => g.module_slug === slug);

      return {
        moduleSlug: slug,
        moduleTitle: meta.title,
        latestRun: grade
          ? {
              id: grade.workflow_run_id || 0,
              name: "AutoGrader",
              status: "completed" as const,
              conclusion: grade.passed ? ("success" as const) : ("failure" as const),
              createdAt: grade.created_at,
              htmlUrl: grade.workflow_url || "",
            }
          : undefined,
        score: grade?.score || 0,
        maxScore: meta.maxScore,
        attempts: dbGrades.filter((g) => g.module_slug === slug).length,
        passed: grade?.passed === 1,
      };
    });
  } else {
    // Fallback: poll GitHub API (free tier / no webhooks yet)
    const runs = await getWorkflowRunsByActor(octokit, owner, repo, username);
    modules = moduleSlugs.map((slug) => {
      const meta = MODULE_META[slug];
      const moduleRuns = runs.filter(
        (r) =>
          r.name.toLowerCase().includes(slug) ||
          r.name.toLowerCase().includes(meta.title.toLowerCase())
      );
      const latestRun = moduleRuns[0];
      const passed =
        latestRun?.status === "completed" &&
        latestRun?.conclusion === "success";

      return {
        moduleSlug: slug,
        moduleTitle: meta.title,
        latestRun,
        score: passed ? meta.maxScore : 0,
        maxScore: meta.maxScore,
        attempts: moduleRuns.length,
        passed,
      };
    });
  }

  const overallScore = modules.reduce((sum, m) => sum + m.score, 0);
  const overallMaxScore = modules.reduce((sum, m) => sum + m.maxScore, 0);

  const progress: StudentProgress = {
    username,
    name: session.user.name || username,
    avatarUrl: session.user.image || "",
    modules,
    contractStatus: dbContract?.status as StudentProgress["contractStatus"] || "none",
    contractIssueNumber: dbContract?.issue_number || undefined,
    learningPath: dbContract?.learning_path as "A" | "B" | "C" | undefined,
    lastActivity: modules
      .map((m) => m.latestRun?.createdAt)
      .filter(Boolean)
      .sort()
      .pop(),
    overallScore,
    overallMaxScore,
  };

  return NextResponse.json({
    progress,
    isTeacher: isTeacher(username),
  });
}
