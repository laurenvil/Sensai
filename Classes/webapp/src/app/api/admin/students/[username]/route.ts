import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import {
  getWorkflowRunsByActor,
  listContractIssues,
} from "@/lib/github";
import { MODULE_META } from "@/lib/constants";
import type { StudentProgress, ModuleProgress } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { octokit, owner, repo, session } = ctx;
  const currentUser = session.user.githubUsername;

  if (!isTeacher(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username } = await params;

  const [runs, contracts] = await Promise.all([
    getWorkflowRunsByActor(octokit, owner, repo, username),
    listContractIssues(octokit, owner, repo),
  ]);

  const contract = contracts.find(
    (c) =>
      c.username.toLowerCase() === username.toLowerCase() ||
      c.username.includes(username)
  );

  const moduleSlugs = Object.keys(MODULE_META);
  const modules: ModuleProgress[] = moduleSlugs.map((slug) => {
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

  const overallScore = modules.reduce((sum, m) => sum + m.score, 0);
  const overallMaxScore = modules.reduce((sum, m) => sum + m.maxScore, 0);

  // Get user profile
  let avatarUrl = "";
  let name = username;
  try {
    const { data: user } = await octokit.users.getByUsername({ username });
    avatarUrl = user.avatar_url;
    name = user.name || username;
  } catch {
    // fallback
  }

  const student: StudentProgress = {
    username,
    name,
    avatarUrl,
    modules,
    contractStatus: contract?.status || "none",
    contractIssueNumber: contract?.number,
    learningPath: contract?.learningPath,
    lastActivity: runs[0]?.createdAt,
    overallScore,
    overallMaxScore,
  };

  return NextResponse.json({
    student,
    runs,
    contract: contract || null,
  });
}
