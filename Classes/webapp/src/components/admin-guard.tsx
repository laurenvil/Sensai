"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    fetch("/api/progress")
      .then((r) => r.json())
      .then((data) => {
        setIsTeacher(data.isTeacher === true);
      })
      .catch(() => setIsTeacher(false))
      .finally(() => setLoading(false));
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Verifying teacher access…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-32 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          Sign In Required
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          You must sign in with GitHub to access the admin panel.
        </p>
      </div>
    );
  }

  if (!isTeacher) {
    return (
      <div className="mx-auto max-w-md px-4 py-32 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
          Access Denied
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Only registered teachers can access the admin panel. Ask your
          administrator to add your GitHub username to the{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">
            TEACHER_USERNAMES
          </code>{" "}
          environment variable.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
