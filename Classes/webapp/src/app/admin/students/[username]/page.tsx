"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  GitBranch,
  FileText,
  TrendingUp,
} from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { StatCard } from "@/components/stat-card";
import type { StudentProgress, WorkflowRun } from "@/types";
import type { ContractIssue } from "@/lib/github";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [student, setStudent] = useState<StudentProgress | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [contract, setContract] = useState<ContractIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvingContract, setApprovingContract] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/students/${username}`)
      .then((r) => r.json())
      .then((data) => {
        setStudent(data.student || null);
        setRuns(data.runs || []);
        setContract(data.contract || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  async function handleApprove() {
    if (!contract) return;
    setApprovingContract(true);
    try {
      const res = await fetch(
        `/api/admin/contracts/${contract.number}/approve`,
        { method: "POST" }
      );
      if (res.ok) {
        setContract((prev) => (prev ? { ...prev, status: "approved" } : null));
        if (student) {
          setStudent({ ...student, contractStatus: "approved" });
        }
      }
    } catch {
      // silently fail
    } finally {
      setApprovingContract(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          Student Not Found
        </h2>
        <Link
          href="/admin"
          className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin Panel
        </Link>
      </div>
    );
  }

  const completedModules = student.modules.filter((m) => m.passed).length;
  const totalModules = student.modules.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Panel
      </Link>

      {/* Student Header */}
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={student.avatarUrl}
            alt={student.username}
            className="h-16 w-16 rounded-full ring-4 ring-white shadow-lg dark:ring-gray-900"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {student.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <a
                href={`https://github.com/${student.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
              >
                @{student.username}
                <ExternalLink className="h-3 w-3" />
              </a>
              {student.learningPath && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  Path {student.learningPath}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Overall Score"
          value={`${student.overallScore}/${student.overallMaxScore}`}
          color="indigo"
        />
        <StatCard
          icon={CheckCircle}
          label="Modules Completed"
          value={`${completedModules}/${totalModules}`}
          color="green"
        />
        <StatCard
          icon={GitBranch}
          label="Workflow Runs"
          value={runs.length}
          color="purple"
        />
        <StatCard
          icon={FileText}
          label="Contract Status"
          value={
            student.contractStatus === "none"
              ? "Not submitted"
              : student.contractStatus.charAt(0).toUpperCase() +
                student.contractStatus.slice(1)
          }
          color={
            student.contractStatus === "approved"
              ? "green"
              : student.contractStatus === "pending"
              ? "amber"
              : "red"
          }
        />
      </div>

      {/* Module Progress + Contract sidebar */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Module Progress Cards */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Module Progress
          </h2>
          {student.modules.map((mod) => (
            <div
              key={mod.moduleSlug}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mod.passed ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : mod.attempts > 0 ? (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {mod.moduleTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {mod.moduleSlug} · {mod.attempts} attempt
                      {mod.attempts !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                  {mod.score}/{mod.maxScore}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={mod.score}
                  max={mod.maxScore}
                  size="md"
                  showLabel={false}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contract Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Learning Contract
            </h3>
            {contract ? (
              <div className="mt-3 space-y-3">
                <div className="text-xs text-gray-500">
                  Issue #{contract.number} ·{" "}
                  {new Date(contract.createdAt).toLocaleDateString()}
                </div>
                <ContractStatusBadge status={contract.status} />
                {contract.status === "pending" && (
                  <button
                    onClick={handleApprove}
                    disabled={approvingContract}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {approvingContract ? "Approving…" : "Approve Contract"}
                  </button>
                )}
                <a
                  href={`https://github.com/${student.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  View on GitHub
                </a>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                No contract submitted yet.
              </p>
            )}
          </div>

          {/* Recent Runs */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recent Workflow Runs
            </h3>
            {runs.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                No workflow runs yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {runs.slice(0, 8).map((run) => (
                  <a
                    key={run.id}
                    href={run.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg p-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RunStatusDot
                      status={run.status}
                      conclusion={run.conclusion}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {run.name}
                      </p>
                      <p className="text-gray-500">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </p>
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

function ContractStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    "in-progress":
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    completed:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RunStatusDot({
  status,
  conclusion,
}: {
  status: string;
  conclusion: string | null;
}) {
  if (status === "completed" && conclusion === "success") {
    return <div className="h-2 w-2 rounded-full bg-emerald-500" />;
  }
  if (status === "completed" && conclusion === "failure") {
    return <div className="h-2 w-2 rounded-full bg-red-500" />;
  }
  return <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />;
}
