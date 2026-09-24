import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";

export const useClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/schools/classes");
      setClasses(res.data.data);
    } catch (err) {
      console.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, refetch: fetchClasses };
};
