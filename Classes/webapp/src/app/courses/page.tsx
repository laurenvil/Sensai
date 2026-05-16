"use client";

import Link from "next/link";
import {
  BookOpen,
  CheckCircle,
  Lock,
  Clock,
  Users,
  Award,
} from "lucide-react";

const MODULES = [
  {
    slug: "module-01-basics",
    title: "Module 01 — Git Basics",
    description:
      "Git fundamentals, your first PR, and setting up your Learning Contract.",
    status: "available" as const,
    topics: ["git init", "git add/commit", "Pull Requests", "Learning Contract"],
    grading: { mastery: 50, contract: 25, community: 25 },
    estimatedTime: "2-3 hours",
  },
  {
    slug: "module-02-branching",
    title: "Module 02 — Branching & Merging",
    description:
      "Feature branches, merge conflicts, CI/CD pipelines, and branch naming conventions.",
    status: "available" as const,
    topics: ["Feature branches", "Merge conflicts", "CI/CD", "Branch naming"],
    grading: { add: 40, subtract: 40, branchExists: 20 },
    estimatedTime: "3-4 hours",
  },
  {
    slug: "module-03-cicd",
    title: "Module 03 — CI/CD",
    description:
      "GitHub Actions, automated testing, deployment pipelines.",
    status: "coming-soon" as const,
    topics: ["GitHub Actions", "YAML workflows", "Automated tests", "Deployment"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-04-opensource",
    title: "Module 04 — Open Source",
    description:
      "Forking, upstream sync, contributing to real projects.",
    status: "coming-soon" as const,
    topics: ["Forking", "Upstream sync", "OSS contributing", "Code of Conduct"],
    grading: {},
    estimatedTime: "TBD",
  },
  {
    slug: "module-05-capstone",
    title: "Module 05 — Capstone",
    description:
      "End-to-end project from idea to deployed site.",
    status: "coming-soon" as const,
    topics: ["Project planning", "Full-stack", "Deployment", "Portfolio"],
    grading: {},
    estimatedTime: "TBD",
  },
];

export default function CoursesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Course Modules
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Work through modules at your own pace. Each module includes starter
          code, AutoGrading, and peer review.
        </p>
      </div>

      {/* Grading overview */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          <Award className="h-4 w-4" />
          100 pts per module
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          AutoGraded via pytest
        </div>
        <div className="flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-sm text-purple-700 dark:bg-purple-950 dark:text-purple-300">
          <Users className="h-4 w-4" />
          Peer review required
        </div>
      </div>

      {/* Module Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <ModuleCard key={mod.slug} module={mod} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module: mod,
}: {
  module: (typeof MODULES)[number];
}) {
  const isAvailable = mod.status === "available";

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white dark:bg-gray-900 ${
        isAvailable
          ? "border-gray-200 dark:border-gray-800"
          : "border-gray-100 opacity-60 dark:border-gray-850"
      }`}
    >
      {/* Card header with gradient */}
      <div className="rounded-t-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <BookOpen className="h-6 w-6 text-white/80" />
          {isAvailable ? (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
              Available
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/70">
              <Lock className="h-3 w-3" />
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-bold text-white">{mod.title}</h3>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mod.description}
        </p>

        {/* Topics */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mod.topics.map((topic) => (
            <span
              key={topic}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Time estimate */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {mod.estimatedTime}
        </div>

        {/* Action */}
        <div className="mt-auto pt-4">
          {isAvailable ? (
            <Link
              href={`/courses/${mod.slug}`}
              className="block w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Start Module
            </Link>
          ) : (
            <div className="block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-400 dark:bg-gray-800">
              Coming Soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
