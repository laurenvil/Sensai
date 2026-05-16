import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-auth";
import { isTeacher } from "@/lib/env";
import { db } from "@/lib/db";
import { listOrgMembers } from "@/lib/github";
import { MODULE_META } from "@/lib/constants";
import type { StudentProgress, ModuleProgress } from "@/types";

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

  // Build progress for each student from DB
  const students = db.listStudents();
  const moduleSlugs = Object.keys(MODULE_META);

  const studentProgress: StudentProgress[] = students
    .filter((s) => !isTeacher(s.username))
    .map((student) => {
      const grades = db.getLatestGrades(student.username);
      const contract = db.getContractByUser(student.username);

      const modules: ModuleProgress[] = moduleSlugs.map((slug) => {
        const meta = MODULE_META[slug];
        const grade = grades.find((g) => g.module_slug === slug);
        const allGrades = db
          .getStudentGrades(student.username)
          .filter((g) => g.module_slug === slug);

        return {
          moduleSlug: slug,
          moduleTitle: meta.title,
          latestRun: grade
            ? {
                id: grade.workflow_run_id || 0,
                name: "AutoGrader",
                status: "completed" as const,
                conclusion: grade.passed
                  ? ("success" as const)
                  : ("failure" as const),
                createdAt: grade.created_at,
                htmlUrl: grade.workflow_url || "",
              }
            : undefined,
          score: grade?.score || 0,
          maxScore: meta.maxScore,
          attempts: allGrades.length,
          passed: grade?.passed === 1,
        };
      });

      const overallScore = modules.reduce((sum, m) => sum + m.score, 0);
      const overallMaxScore = modules.reduce((sum, m) => sum + m.maxScore, 0);

      return {
        username: student.username,
        name: student.name || student.username,
        avatarUrl: student.avatar_url || "",
        modules,
        contractStatus:
          (contract?.status as StudentProgress["contractStatus"]) || "none",
        contractIssueNumber: contract?.issue_number || undefined,
        learningPath: contract?.learning_path as "A" | "B" | "C" | undefined,
        lastActivity: grades[0]?.created_at,
        overallScore,
        overallMaxScore,
      };
    });

  return NextResponse.json({ students: studentProgress });
}
