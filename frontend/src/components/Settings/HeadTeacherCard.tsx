import { useState, useEffect, useRef } from "react";
import {
  UserCog,
  Upload,
  Loader2,
  Trash2,
  Check,
  Pencil,
  X,
  MessageSquare,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";
import { usePermission } from "../../hooks/usePermission";

export default function HeadTeacherCard() {
  const { can } = usePermission();
  const canEdit = can("settings", "write");

  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  // 🎯 Default comments state
  const [commentExcellent, setCommentExcellent] = useState("");
  const [commentGood, setCommentGood] = useState("");
  const [commentFail, setCommentFail] = useState("");
  const [isEditingComments, setIsEditingComments] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingComments, setSavingComments] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [uploading, setUploading] = useState<"signature" | "stamp" | null>(
    null,
  );

  const sigInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api
      .get("/schools/settings/head-teacher")
      .then((res) => {
        const loadedName = res.data.data.headTeacherName || "";
        setName(loadedName);
        setSavedName(loadedName);
        setSignatureUrl(res.data.data.headTeacherSignatureUrl || null);
        setStampUrl(res.data.data.headTeacherStampUrl || null);
        setCommentExcellent(res.data.data.commentExcellent || "");
        setCommentGood(res.data.data.commentGood || "");
        setCommentFail(res.data.data.commentFail || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (file: File, field: "signature" | "stamp") => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be less than 2MB");
      return;
    }
    setUploading(field);
    const formData = new FormData();
    formData.append(field, file);
    try {
      const res = await api.post(
        "/schools/settings/head-teacher/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (field === "signature") setSignatureUrl(res.data.data.url);
      else setStampUrl(res.data.data.url);
      toast.success(
        `${field === "signature" ? "Signature" : "Stamp"} uploaded`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await api.put("/schools/settings/head-teacher", {
        headTeacherName: name,
      });
      setSavedName(name);
      setIsEditingName(false);
      toast.success("Head teacher name saved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveComments = async () => {
    setSavingComments(true);
    try {
      await api.put("/schools/settings/head-teacher", {
        commentExcellent,
        commentGood,
        commentFail,
      });
      toast.success("Default comments saved");
      setIsEditingComments(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSavingComments(false);
    }
  };

  const handleRemove = async (field: "signature" | "stamp") => {
    try {
      await api.delete(`/schools/settings/head-teacher/${field}`);
      if (field === "signature") setSignatureUrl(null);
      else setStampUrl(null);
      toast.success(`${field === "signature" ? "Signature" : "Stamp"} removed`);
    } catch {
      toast.error("Remove failed");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex justify-center">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <UserCog size={16} className="text-gray-400" />
        <h3 className="font-medium text-gray-800">Head Teacher</h3>
      </div>

      <div className="p-5">
        {/* 🎯 Single Row Table Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* 1. Name Column */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Head Teacher Name
            </label>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mr. John Phiri"
                  autoFocus
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving || name.trim() === ""}
                  className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
                  title="Save"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setName(savedName);
                    setIsEditingName(false);
                  }}
                  disabled={saving}
                  className="p-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 border border-transparent hover:border-gray-200 rounded-lg px-3 py-2 transition-colors group">
                <span className="text-sm font-medium text-gray-800">
                  {savedName || (
                    <span className="text-gray-400 italic">Not set</span>
                  )}
                </span>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit name"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. Signature Column */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Signature
            </label>
            {signatureUrl ? (
              <div className="flex items-center gap-2 group">
                <div className="h-12 flex-1 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="h-full object-contain"
                  />
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleRemove("signature")}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove signature"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ) : canEdit ? (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={sigInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "signature");
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => sigInputRef.current?.click()}
                  disabled={uploading !== null}
                  className="flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 h-12 text-xs text-gray-600 hover:border-[var(--color-primary)] hover:bg-gray-50 transition-colors w-full disabled:opacity-50"
                >
                  {uploading === "signature" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploading === "signature" ? "Uploading..." : "Upload"}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 italic py-2">Not uploaded</p>
            )}
          </div>

          {/* 3. Stamp Column */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              School Stamp
            </label>
            {stampUrl ? (
              <div className="flex items-center gap-2 group">
                <div className="h-12 flex-1 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={stampUrl}
                    alt="Stamp"
                    className="h-full object-contain"
                  />
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleRemove("stamp")}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove stamp"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ) : canEdit ? (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={stampInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "stamp");
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => stampInputRef.current?.click()}
                  disabled={uploading !== null}
                  className="flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 h-12 text-xs text-gray-600 hover:border-[var(--color-primary)] hover:bg-gray-50 transition-colors w-full disabled:opacity-50"
                >
                  {uploading === "stamp" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploading === "stamp" ? "Uploading..." : "Upload"}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 italic py-2">Not uploaded</p>
            )}
          </div>
        </div>

        {/* 🎯 Default Report Card Comments */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-600" />
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  Default Report Card Comments
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Auto-applied to every report card based on the student's final
                  grade.
                </p>
              </div>
            </div>
            {!isEditingComments && canEdit && (
              <button
                onClick={() => setIsEditingComments(true)}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Edit Comments
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">
                🟢 Excellent Performance (Grade A / Points 1-3)
              </label>
              <textarea
                value={commentExcellent}
                onChange={(e) => setCommentExcellent(e.target.value)}
                disabled={!isEditingComments}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-600 resize-none"
                placeholder="e.g. Excellent work. You are a shining star, keep it up!"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                🔵 Good / Passed (Grade B-C / Points 4-6)
              </label>
              <textarea
                value={commentGood}
                onChange={(e) => setCommentGood(e.target.value)}
                disabled={!isEditingComments}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-600 resize-none"
                placeholder="e.g. Good effort. With more focus, you'll do even better next term."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-red-700 mb-1">
                🔴 Failed / Needs Improvement (Grade F / Points 7-9)
              </label>
              <textarea
                value={commentFail}
                onChange={(e) => setCommentFail(e.target.value)}
                disabled={!isEditingComments}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-600 resize-none"
                placeholder="e.g. Needs serious improvement. Please see me for extra help."
              />
            </div>
          </div>

          {isEditingComments && (
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setIsEditingComments(false)}
                disabled={savingComments}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComments}
                disabled={savingComments}
                className="px-4 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingComments && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Save Comments
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
