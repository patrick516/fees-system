import { useState, useEffect, useRef } from "react";
import { UserCog, Upload, Loader2, Trash2 } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";
import { usePermission } from "../../hooks/usePermission";

export default function HeadTeacherCard() {
  const { can } = usePermission();
  const canEdit = can("settings", "write");

  const [name, setName] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setName(res.data.data.headTeacherName || "");
        setSignatureUrl(res.data.data.headTeacherSignatureUrl || null);
        setStampUrl(res.data.data.headTeacherStampUrl || null);
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
      toast.success("Head teacher name saved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
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

      <div className="p-5 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Head Teacher Name
          </label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mr. John Phiri"
              disabled={!canEdit}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50"
            />
            {canEdit && (
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save
              </button>
            )}
          </div>
        </div>

        {/* Signature */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Signature (PNG/JPG, max 2MB)
          </label>
          {signatureUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={signatureUrl}
                alt="Signature"
                className="h-16 object-contain border border-gray-200 rounded-lg bg-gray-50"
              />
              {canEdit && (
                <button
                  onClick={() => handleRemove("signature")}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
                className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-[var(--color-primary)] hover:bg-gray-50 transition-colors w-full disabled:opacity-50"
              >
                {uploading === "signature" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {uploading === "signature"
                  ? "Uploading..."
                  : "Click to upload signature"}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Not uploaded</p>
          )}
        </div>

        {/* Stamp */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            School Stamp (PNG/JPG, max 2MB)
          </label>
          {stampUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={stampUrl}
                alt="Stamp"
                className="h-16 object-contain border border-gray-200 rounded-lg bg-gray-50"
              />
              {canEdit && (
                <button
                  onClick={() => handleRemove("stamp")}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
                className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-[var(--color-primary)] hover:bg-gray-50 transition-colors w-full disabled:opacity-50"
              >
                {uploading === "stamp" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {uploading === "stamp"
                  ? "Uploading..."
                  : "Click to upload stamp"}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Not uploaded</p>
          )}
        </div>
      </div>
    </div>
  );
}
