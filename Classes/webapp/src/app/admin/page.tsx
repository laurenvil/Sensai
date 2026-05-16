"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Search,
  ArrowUpDown,
  UserPlus,
  Mail,
  Send,
  Loader2,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ProgressBar } from "@/components/progress-bar";
import type { StudentProgress, ClassroomOverview } from "@/types";

type SortKey = "name" | "score" | "activity" | "contract";
type SortDir = "asc" | "desc";

export default function AdminDashboard() {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [overview, setOverview] = useState<ClassroomOverview | null>(null);
  const [pendingContracts, setPendingContracts] = useState<
    { number: number; username: string; learningPath?: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [pendingInvites, setPendingInvites] = useState<
    { id: number; login: string | null; email: string | null; createdAt: string }[]
  >([]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/students").then((r) => r.json()),
      fetch("/api/admin/overview").then((r) => r.json()),
      fetch("/api/admin/invite").then((r) => r.json()),
    ])
      .then(([studentsData, overviewData, inviteData]) => {
        setStudents(studentsData.students || []);
        setOverview(overviewData.overview || null);
        setPendingContracts(overviewData.pendingContracts || []);
        setPendingInvites(inviteData.invitations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(issueNumber: number) {
    setApprovingId(issueNumber);
    try {
      const res = await fetch(
        `/api/admin/contracts/${issueNumber}/approve`,
        { method: "POST" }
      );
      if (res.ok) {
        setPendingContracts((prev) =>
          prev.filter((c) => c.number !== issueNumber)
        );
      }
    } catch {
      // silently fail
    } finally {
      setApprovingId(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setInviteStatus("loading");
    setInviteError("");
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: inviteInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite");
      setInviteStatus("success");
      setInviteInput("");
      // Refresh pending invites
      fetch("/api/admin/invite").then(r => r.json()).then(d => setPendingInvites(d.invitations || []));
      setTimeout(() => setInviteStatus("idle"), 3000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Unknown error");
      setInviteStatus("error");
    }
  }

  async function handleBulkInvite() {
    const usernames = inviteInput.split(/[,\n]+/).map(u => u.trim()).filter(Boolean);
    if (usernames.length === 0) return;
    setInviteStatus("loading");
    setInviteError("");
    const errors: string[] = [];
    for (const u of usernames) {
      try {
        const res = await fetch("/api/admin/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernameOrEmail: u }),
        });
        const data = await res.json();
        if (!res.ok) errors.push(`${u}: ${data.error}`);
      } catch { errors.push(`${u}: Network error`); }
    }
    if (errors.length > 0) {
      setInviteError(errors.join(" · "));
      setInviteStatus("error");
    } else {
      setInviteStatus("success");
      setInviteInput("");
      setTimeout(() => setInviteStatus("idle"), 3000);
    }
    fetch("/api/admin/invite").then(r => r.json()).then(d => setPendingInvites(d.invitations || []));
  }

  async function handleCancelInvite(invitationId: number) {
    setCancellingId(invitationId);
    try {
      await fetch("/api/admin/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      setPendingInvites(prev => prev.filter(i => i.id !== invitationId));
    } catch { /* silently fail */ }
    finally { setCancellingId(null); }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = students.filter((s) =>
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "name":
        return a.username.localeCompare(b.username) * dir;
      case "score":
        return (a.overallScore - b.overallScore) * dir;
      case "activity":
        return (
          ((a.lastActivity || "").localeCompare(b.lastActivity || "")) * dir
        );
      case "contract":
        return a.contractStatus.localeCompare(b.contractStatus) * dir;
      default:
        return 0;
    }
  });

  const avgScore =
    students.length > 0
      ? Math.round(
          students.reduce((sum, s) => sum + s.overallScore, 0) /
            students.length
        )
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading classroom data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
          <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Teacher Admin Panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Classroom overview &amp; student progress tracking
          </p>
        </div>
        <div className="ml-auto">
          <Link
            href="/admin/drafts"
            className="flex items-center gap-2 rounded-lg bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition-colors"
          >
            Review AI Modules
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={overview?.totalStudents ?? students.length}
          color="indigo"
        />
        <StatCard
          icon={FileCheck}
          label="Contracts Submitted"
          value={overview?.contractsSubmitted ?? 0}
          color="blue"
          subtitle={`${pendingContracts.length} pending approval`}
        />
        <StatCard
          icon={TrendingUp}
          label="Average Score"
          value={`${avgScore} pts`}
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Contracts Approved"
          value={overview?.contractsApproved ?? 0}
          color="purple"
        />
      </div>

      {/* Invite Students Section */}
      <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 dark:border-indigo-900 dark:bg-indigo-950/30">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <UserPlus className="h-5 w-5 text-indigo-500" />
            Invite Students
          </h2>
          <a
            href={`https://github.com/orgs/${process.env.NEXT_PUBLIC_GITHUB_ORG || ''}/people`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            Manage on GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Invite students to join the GitHub organization. They&apos;ll receive an email invitation and can then fork the repo to begin.
        </p>

        <form onSubmit={handleInvite} className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="GitHub username or email (comma-separated for bulk)"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={inviteStatus === "loading" || !inviteInput.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {inviteStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {inviteInput.includes(",") || inviteInput.includes("\n") ? "Bulk Invite" : "Send Invite"}
          </button>
        </form>

        {inviteStatus === "success" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Invitation sent successfully!
          </div>
        )}
        {inviteStatus === "error" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {inviteError}
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pending Invitations ({pendingInvites.length})
            </h3>
            <div className="mt-2 space-y-2">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                      <Mail className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {inv.login || inv.email || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Invited {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancellingId === inv.id}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
                    title="Cancel invitation"
                  >
                    {cancellingId === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Two column: Pending Contracts + Search */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Pending Contracts */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900 dark:bg-amber-950/30 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Contracts
          </h2>
          {pendingContracts.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No contracts awaiting approval.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingContracts.map((c) => (
                <div
                  key={c.number}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-gray-900"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      Path {c.learningPath || "?"} · Issue #{c.number}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApprove(c.number)}
                    disabled={approvingId === c.number}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {approvingId === c.number ? "…" : "Approve"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Roster */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Student Roster
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                    >
                      Student
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => toggleSort("score")}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                    >
                      Progress
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => toggleSort("contract")}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                    >
                      Contract
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => toggleSort("activity")}
                      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                    >
                      Last Active
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-gray-500"
                    >
                      {search
                        ? "No students match your search."
                        : "No students found in the organization."}
                    </td>
                  </tr>
                ) : (
                  sorted.map((student) => (
                    <tr
                      key={student.username}
                      className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.username}
                            className="h-8 w-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.username}
                            </p>
                            {student.learningPath && (
                              <p className="text-xs text-gray-500">
                                Path {student.learningPath}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 min-w-[160px]">
                        <ProgressBar
                          value={student.overallScore}
                          max={student.overallMaxScore}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <ContractBadge status={student.contractStatus} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        {student.lastActivity
                          ? timeAgo(student.lastActivity)
                          : "Never"}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/students/${student.username}`}
                          className="flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-800"
                        >
                          View
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    none: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    "in-progress":
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    completed:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  };

  const icons: Record<string, React.ReactNode> = {
    none: null,
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    "in-progress": <TrendingUp className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] || styles.none
      }`}
    >
      {icons[status]}
      {status === "none" ? "Not submitted" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
