"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useTeacherStatus() {
  const { data: session } = useSession();
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setIsTeacher(false);
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

  return { isTeacher, loading };
}
