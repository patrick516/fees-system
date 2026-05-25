import { useState } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  Clock,
  XCircle,
} from "lucide-react";
import api from "../../lib/axios";

const smsTypes = [
  {
    id: "reminder",
    label: "Fee Reminder",
    icon: Clock,
    description: "Send reminder to all parents with outstanding balance",
    color: "border-yellow-200 bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    id: "announcement",
    label: "General Announcement",
    icon: MessageSquare,
    description: "Send a custom message to all parents",
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "unpaid",
    label: "Unpaid Students Alert",
    icon: XCircle,
    description: "Notify parents of students with zero payment",
    color: "border-red-200 bg-red-50",
    iconColor: "text-red-600",
  },
];

const SMSPage = () => {
  const [selectedType, setSelectedType] = useState("");
  const [message, setMessage] = useState("");
  const [term, setTerm] = useState("TERM_1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!selectedType) return;
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/sms/bulk", {
        type: selectedType,
        message: message || undefined,
        term,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send SMS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Send SMS</h2>
        <p className="text-sm text-gray-500">
          Send bulk SMS notifications to parents
        </p>
      </div>

      {/* SMS Type Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Select message type</p>
        {smsTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all ${
              selectedType === type.id
                ? "border-blue-500 bg-blue-50"
                : type.color
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center`}
            >
              <type.icon size={20} className={type.iconColor} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{type.label}</p>
              <p className="text-xs text-gray-500">{type.description}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TERM_1">Term 1</option>
              <option value="TERM_2">Term 2</option>
              <option value="TERM_3">Term 3</option>
            </select>
          </div>

          {selectedType === "announcement" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to all parents..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {message.length} characters
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              ✅ {result.message} — {result.data?.sent || 0} messages sent
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={
              loading || (selectedType === "announcement" && !message.trim())
            }
            className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send size={16} /> Send SMS Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Info box */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-start gap-3">
          <Users size={16} className="text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700">About bulk SMS</p>
            <p className="text-xs text-gray-500 mt-1">
              SMS messages are sent via Africa's Talking. Each message costs
              approximately MWK 10. Messages are sent to all matching parents in
              your school.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSPage;
