"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle,
  Clock,
  GitPullRequest,
  AlertCircle,
  Activity,
  Plus,
  Shield,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ProgressBar } from "@/components/progress-bar";
import type { StudentProgress, WorkflowRun } from "@/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      Promise.all([
        fetch("/api/github/workflow-runs")
          .then((r) => r.json())
          .catch(() => ({ runs: [] })),
        fetch("/api/progress")
          .then((r) => r.json())
          .catch(() => ({ progress: null, isTeacher: false })),
      ])
        .then(([runsData, progressData]) => {
          setRuns(runsData.runs || []);
          setProgress(progressData.progress || null);
          setIsTeacher(progressData.isTeacher === true);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to gitClasses
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Sign in with GitHub to access your dashboard, track progress, and
          interact with AI.
        </p>
      </div>
    );
  }

  const completedModules =
    progress?.modules.filter((m) => m.passed).length ?? 0;
  const totalModules = progress?.modules.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {session.user?.name || session.user?.githubUsername}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isTeacher && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
          <Link
            href="/ai"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Ask AI
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Modules Available"
          value={loading ? "…" : String(totalModules)}
          color="indigo"
        />
        <StatCard
          icon={CheckCircle}
          label="Modules Completed"
          value={loading ? "…" : String(completedModules)}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Overall Score"
          value={
            loading
              ? "…"
              : `${progress?.overallScore ?? 0}/${progress?.overallMaxScore ?? 0}`
          }
          color="purple"
        />
        <StatCard
          icon={Activity}
          label="Workflow Runs"
          value={loading ? "…" : String(runs.length)}
          color="amber"
        />
      </div>

      {/* My Progress + Quick Actions */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* My Progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            My Progress
          </h2>
          {loading ? (
            <div className="mt-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : progress && progress.modules.length > 0 ? (
            <div className="mt-4 space-y-4">
              {progress.modules.map((mod) => (
                <div key={mod.moduleSlug}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {mod.passed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : mod.attempts > 0 ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {mod.moduleTitle}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-gray-500">
                      {mod.score}/{mod.maxScore}
                    </span>
                  </div>
                  <ProgressBar
                    value={mod.score}
                    max={mod.maxScore}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              ))}

              {/* Contract status */}
              {progress.contractStatus !== "none" && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <GitPullRequest className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Learning Contract:{" "}
                    <span className="font-medium capitalize">
                      {progress.contractStatus}
                    </span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              No progress data yet. Start a module to begin tracking!
            </p>
          )}
        </div>

        {/* Quick Actions + Recent Runs */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <div className="mt-4 space-y-3">
              <ActionLink
                href="/courses"
                icon={BookOpen}
                label="Browse Course Modules"
                description="Start or continue a module"
              />
              <ActionLink
                href="/dashboard/contract"
                icon={GitPullRequest}
                label="Submit Learning Contract"
                description="Define your learning goals"
              />
              <ActionLink
                href="/dashboard/workflows"
                icon={Activity}
                label="Trigger Workflow"
                description="Run module generation or grading"
              />
              <ActionLink
                href="/ai"
                icon={AlertCircle}
                label="Get AI Help"
                description="Ask about a module or debug test failures"
              />
            </div>
          </div>

          {/* Recent Workflow Runs */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Workflow Runs
            </h2>
            {loading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
                  />
                ))}
              </div>
            ) : runs.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                No workflow runs yet. Push code to your repo to trigger the
                AutoGrader.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {runs.slice(0, 5).map((run) => (
                  <a
                    key={run.id}
                    href={run.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <RunStatusIcon
                        status={run.status}
                        conclusion={run.conclusion}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {run.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(run.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof BookOpen;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 transition-colors"
    >
      <Icon className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </Link>
  );
}

function RunStatusIcon({
  status,
  conclusion,
}: {
  status: string;
  conclusion: string | null;
}) {
  if (status === "completed" && conclusion === "success") {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  }
  if (status === "completed" && conclusion === "failure") {
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
  return <Clock className="h-5 w-5 animate-spin text-amber-500" />;
}
