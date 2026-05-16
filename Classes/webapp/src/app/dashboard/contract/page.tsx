"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";

const PATHS = [
  { id: "A", name: "Guided", desc: "Follow step-by-step starter code" },
  { id: "B", name: "Explorer", desc: "Build an original project" },
  { id: "C", name: "Expert", desc: "Improve the curriculum itself" },
];

export default function LearningContractPage() {
  const { data: session } = useSession();
  const [path, setPath] = useState("A");
  const [module, setModule] = useState("module-01-basics");
  const [goals, setGoals] = useState(["", "", ""]);
  const [projectIdea, setProjectIdea] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ issueNumber?: number; error?: string }>({});

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <p className="text-gray-500">Sign in to submit a Learning Contract.</p>
      </div>
    );
  }

  async function submit() {
    setStatus("loading");

    const pathLabel = PATHS.find((p) => p.id === path);
    const body = `## Student Information

- **Full Name:** ${session!.user?.name || session!.user?.githubUsername}
- **GitHub Username:** @${session!.user?.githubUsername}
- **Module:** ${module}

---

## Chosen Learning Path

- [${path === "A" ? "x" : " "}] **Path A (Guided):** I will follow the step-by-step starter code
- [${path === "B" ? "x" : " "}] **Path B (Explorer):** I will build an original project
- [${path === "C" ? "x" : " "}] **Path C (Expert):** I will submit a Pull Request to improve the curriculum

---

## My Three Learning Goals

1. ${goals[0]}
2. ${goals[1]}
3. ${goals[2]}

---

## Peer Review Commitment

- [x] I agree to review at least 2 peers' Pull Requests
- [x] I have read the Community Guidelines
- [x] I understand that copying code without attribution violates the collaboration policy

---

## My Project Idea (Path B/C only)

> ${projectIdea || "N/A"}`;

    try {
      const res = await fetch("/api/github/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Contract] - ${session!.user?.name || session!.user?.githubUsername}`,
          content: body,
          labels: ["contract-pending"],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({ issueNumber: data.issueNumber });
      setStatus("success");
    } catch (e: unknown) {
      setResult({ error: e instanceof Error ? e.message : "Unknown error" });
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Contract Submitted!
        </h2>
        <p className="mt-2 text-gray-500">
          Issue #{result.issueNumber} created. Your teacher will review and
          approve it.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Once approved, AI will generate a personalized curriculum for you.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Learning Contract
        </h1>
      </div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Define your learning path before you begin. This creates a GitHub Issue
        that your teacher will approve. AI then generates a personalized
        curriculum.
      </p>

      <div className="mt-8 space-y-6">
        {/* Learning Path */}
        <fieldset>
          <legend className="text-sm font-semibold text-gray-900 dark:text-white">
            Choose Your Learning Path
          </legend>
          <div className="mt-3 space-y-2">
            {PATHS.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  path === p.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="path"
                  value={p.id}
                  checked={path === p.id}
                  onChange={() => setPath(p.id)}
                  className="text-indigo-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Path {p.id} — {p.name}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Module */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Module
          </label>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="module-01-basics">Module 01 — Basics</option>
            <option value="module-02-branching">Module 02 — Branching</option>
          </select>
        </div>

        {/* Learning Goals */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Three Learning Goals
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            What do you want to master in this module?
          </p>
          {goals.map((goal, i) => (
            <input
              key={i}
              type="text"
              value={goal}
              onChange={(e) => {
                const next = [...goals];
                next[i] = e.target.value;
                setGoals(next);
              }}
              placeholder={`Goal ${i + 1}`}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          ))}
        </div>

        {/* Project Idea (B/C only) */}
        {(path === "B" || path === "C") && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Project Idea
            </label>
            <textarea
              value={projectIdea}
              onChange={(e) => setProjectIdea(e.target.value)}
              placeholder="Briefly describe your project or proposed improvement..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            {result.error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={status === "loading" || goals.some((g) => !g.trim())}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit Learning Contract
        </button>
      </div>
    </div>
  );
}
