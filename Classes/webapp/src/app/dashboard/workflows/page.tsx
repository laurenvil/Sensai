"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  BookOpen,
  FileText,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";

interface WorkflowDef {
  id: string;
  file: string;
  name: string;
  description: string;
  icon: typeof Play;
  role: "teacher" | "any";
  inputs?: { key: string; label: string; placeholder: string }[];
}

const WORKFLOWS: WorkflowDef[] = [
  {
    id: "generate-module",
    file: "generate-module.yml",
    name: "Generate AI Module",
    description:
      "Create a complete module (README, code, tests, resources) from a topic using AI.",
    icon: BookOpen,
    role: "teacher",
    inputs: [
      {
        key: "topic",
        label: "Module Topic",
        placeholder: "e.g., Introduction to APIs",
      },
      {
        key: "module_number",
        label: "Module Number",
        placeholder: "e.g., 03",
      },
      {
        key: "module_description",
        label: "Module Description",
        placeholder: "e.g., Focus on recursive functions...",
      },
      {
        key: "difficulty",
        label: "Difficulty Level",
        placeholder: "beginner, intermediate, or advanced",
      },
    ],
  },
  {
    id: "generate-pages",
    file: "generate-pages.yml",
    name: "Generate Course Website",
    description:
      "Build a premium GitHub Pages site from your existing modules.",
    icon: Globe,
    role: "teacher",
  },
  {
    id: "deploy-pages",
    file: "deploy-pages.yml",
    name: "Deploy Pages",
    description: "Deploy the course site to GitHub Pages.",
    icon: Zap,
    role: "teacher",
  },
  {
    id: "classroom",
    file: "classroom.yml",
    name: "Run AutoGrader",
    description:
      "Manually trigger the AutoGrader workflow (normally runs on push).",
    icon: FileText,
    role: "any",
  },
];

export default function WorkflowsPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center">
        <p className="text-gray-500">Sign in to manage workflows.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        GitHub Workflows
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Trigger GitHub Actions workflows directly from the webapp. These connect
        to the same workflows in your <code>.github/workflows/</code> directory.
      </p>

      <div className="mt-8 space-y-6">
        {WORKFLOWS.map((wf) => (
          <WorkflowCard key={wf.id} workflow={wf} />
        ))}
      </div>
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: WorkflowDef }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const Icon = workflow.icon;

  async function trigger() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/github/trigger-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowFile: workflow.file,
          inputs: workflow.inputs
            ? Object.fromEntries(
                workflow.inputs.map((i) => [i.key, inputs[i.key] || ""])
              )
            : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to trigger workflow");
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {workflow.name}
              </h3>
              {workflow.role === "teacher" && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                  Teacher
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {workflow.description}
            </p>
            <p className="mt-1 text-xs text-gray-400 font-mono">
              {workflow.file}
            </p>
          </div>
        </div>
      </div>

      {/* Inputs */}
      {workflow.inputs && (
        <div className="mt-4 space-y-3">
          {workflow.inputs.map((input) => (
            <div key={input.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {input.label}
              </label>
              <input
                type="text"
                value={inputs[input.key] || ""}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [input.key]: e.target.value }))
                }
                placeholder={input.placeholder}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          ))}
        </div>
      )}

      {/* Trigger button + status */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={trigger}
          disabled={status === "loading"}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            status === "loading"
              ? "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {status === "loading" ? "Running..." : "Run Workflow"}
        </button>

        {status === "success" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Workflow triggered!
          </span>
        )}

        {status === "error" && (
          <span className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errorMsg}
          </span>
        )}
      </div>
    </div>
  );
}
