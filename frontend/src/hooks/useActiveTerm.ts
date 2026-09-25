import { useEffect, useState } from "react";
import api from "../lib/axios";
import { getCurrentAcademicYear } from "../lib/utils";

interface ActiveTermResponse {
  activeTerm: string | null;
  activeAcademicYear: string | null;
}

/**
 * Reads the school's currently activated term + academic year.
 * Falls back to the current academic year when nothing's activated yet.
 */
export function useActiveTerm() {
  const [data, setData] = useState<ActiveTermResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/schools/active-term")
      .then((res) => setData(res.data.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    loading,
    activeTerm: data?.activeTerm || null,
    academicYear: data?.activeAcademicYear || getCurrentAcademicYear(),
  };
}
