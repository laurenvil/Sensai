"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bot, Loader2, GitPullRequest, Clock, ChevronRight } from "lucide-react";

export default function DraftsPage() {
  const { data: session, status } = useSession();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/admin/drafts")
        .then((res) => res.json())
        .then((data) => setDrafts(data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500">Sign in to view drafts.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
          <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Module Drafts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review, edit, and approve AI-generated curriculum modules.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <Bot className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
              No pending drafts
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Trigger a new module generation from the workflows page.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/workflows"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Go to Workflows
              </Link>
            </div>
          </div>
        ) : (
          drafts.map((draft) => (
            <Link
              key={draft.number}
              href={`/admin/drafts/${draft.number}`}
              className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <GitPullRequest className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {draft.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </span>
                      <span>Branch: {draft.branch}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
