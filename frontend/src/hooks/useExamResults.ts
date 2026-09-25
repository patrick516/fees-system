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

  const getGradeBoundaries = async (system: "POINTS" | "LETTER") => {
    try {
      const res = await api.get("/exams/grade-boundaries", {
        params: { system },
      });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const setGradeBoundaries = async (
    boundaries: any[],
    system: "POINTS" | "LETTER",
  ) => {
    try {
      const res = await api.put("/exams/grade-boundaries", {
        boundaries,
        system,
      });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const updateClassGradingSystem = async (
    classId: string,
    gradingSystem: "POINTS" | "LETTER",
  ) => {
    try {
      const res = await api.put(`/exams/classes/${classId}/grading-system`, {
        gradingSystem,
      });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };
  const getClassResults = async (classId: string, examPeriodId: string) => {
    try {
      const res = await api.get("/exams/class-results", {
        params: { classId, examPeriodId },
      });
      return {
        success: true,
        data: res.data.data,
        gradingSystem: res.data.gradingSystem as
          | "POINTS"
          | "LETTER"
          | undefined,
      };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const getPendingRows = async (classId?: string, examPeriodId?: string) => {
    try {
      const res = await api.get("/exams/pending-rows", {
        params: { classId, examPeriodId },
      });
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const resolvePendingRow = async (pendingRowId: string, studentId: string) => {
    try {
      const res = await api.post(
        `/exams/pending-rows/${pendingRowId}/resolve`,
        {
          studentId,
        },
      );
      return { success: true, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message };
    }
  };

  const discardPendingRow = async (pendingRowId: string) => {
    try {
      await api.delete(`/exams/pending-rows/${pendingRowId}`);
      return { success: true };
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
    getClassResults,
    updateClassGradingSystem,
    getPendingRows,
    resolvePendingRow,
    discardPendingRow,
  };
};
