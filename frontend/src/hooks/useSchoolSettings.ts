import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";
import type { School } from "../types";

export const useSchoolSettings = () => {
  const [settings, setSettings] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/schools/settings");
      setSettings(res.data.data);
    } catch (err) {
      console.error("Failed to load school settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (data: Partial<School>) => {
    setSaving(true);
    try {
      const res = await api.put("/schools/settings", data);
      setSettings(res.data.data);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to save settings",
      };
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await api.post("/schools/settings/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSettings((prev) =>
        prev ? { ...prev, logo: res.data.data.logo } : prev,
      );
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to upload logo",
      };
    } finally {
      setUploadingLogo(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    uploadingLogo,
    updateSettings,
    uploadLogo,
    refetch: fetchSettings,
  };
};
