"use client";

import Link from "next/link";
import {
  BookOpen,
  Users,
  Settings,
  FileText,
  GitBranch,
  Bot,
  Award,
  Scale,
} from "lucide-react";

const DOC_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      {
        href: "/docs/overview",
        icon: BookOpen,
        title: "Overview",
        description: "What gitClasses is and how it works.",
      },
      {
        href: "/docs/teacher-setup",
        icon: Settings,
        title: "Teacher Setup",
        description: "Deploy a course in 30 minutes.",
      },
      {
        href: "/docs/student-guide",
        icon: FileText,
        title: "Student Guide",
        description: "How to accept an assignment and start learning.",
      },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      {
        href: "/docs/learning-paths",
        icon: GitBranch,
        title: "Learning Paths",
        description: "Path A (Guided), B (Explorer), C (Expert).",
      },
      {
        href: "/docs/autograding",
        icon: Award,
        title: "AutoGrading",
        description: "How pytest scoring and GitHub Actions work together.",
      },
      {
        href: "/docs/peer-review",
        icon: Users,
        title: "Peer Review",
        description: "The 2-for-1 rule and Code of Review.",
      },
      {
        href: "/docs/ai-features",
        icon: Bot,
        title: "AI Features",
        description: "Failure explanations, quizzes, and curriculum generation.",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        href: "/docs/community",
        icon: Scale,
        title: "Community Guidelines",
        description: "Code of Review, collaboration vs. plagiarism.",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Documentation
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Everything you need to know about setting up, teaching with, and
        learning through gitClasses.
      </p>

      {DOC_SECTIONS.map((section) => (
        <div key={section.title} className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {section.title}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
                    <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
