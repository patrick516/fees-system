import { useState, useCallback } from "react";
import api from "../lib/axios";

export const useExamResults = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const getPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/exams/periods");
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createPeriod = async (payload: {
    name: string;
    term: string;
    academicYear: string;
    examType?: string;
  }) => {
    try {
      const res = await api.post("/exams/periods", payload);
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const togglePeriodActive = async (id: string, isActive: boolean) => {
    try {
      const res = await api.put(`/exams/periods/${id}/activate`, { isActive });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const getGradeBoundaries = async () => {
    try {
      const res = await api.get("/exams/grade-boundaries");
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const setGradeBoundaries = async (boundaries: any[]) => {
    try {
      const res = await api.put("/exams/grade-boundaries", { boundaries });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const uploadResults = async (
    file: File,
    classId: string,
    examPeriodId: string,
  ) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classId", classId);
      formData.append("examPeriodId", examPeriodId);

      const res = await api.post("/exams/results/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    } finally {
      setUploading(false);
    }
  };

  return {
    loading,
    uploading,
    getPeriods,
    createPeriod,
    togglePeriodActive,
    getGradeBoundaries,
    setGradeBoundaries,
    uploadResults,
  };
};
