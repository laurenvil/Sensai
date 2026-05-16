"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export function useTeacherStatus() {
  const { data: session, status } = useSession();
  const [isTeacher, setIsTeacher] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setIsTeacher(data.isTeacher === true);
      })
      .catch(() => { if (!cancelled) setIsTeacher(false); })
      .finally(() => { if (!cancelled) setFetchDone(true); });
    return () => { cancelled = true; };
  }, [session]);

  const loading = useMemo(() => {
    if (status === "loading") return true;
    if (!session) return false;
    return !fetchDone;
  }, [status, session, fetchDone]);

  return { isTeacher, loading };
}
