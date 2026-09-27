import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const onLoginPage =
      typeof window !== "undefined" &&
      window.location.pathname.includes("/login");

    // ============ 429 — RATE LIMITED ============
    // Don't log the user out. Dispatch a global event so the
    // <RateLimitModal /> can show a countdown overlay instead.
    if (status === 429 && typeof window !== "undefined") {
      const retryAfterSec = parseInt(
        error.response.headers?.["retry-after"] || "900",
        10,
      );
      const message =
        error.response?.data?.message ||
        "Too many requests. Please wait before trying again.";

      window.dispatchEvent(
        new CustomEvent("api:rate-limited", {
          detail: { retryAfterSec, message },
        }),
      );
      return Promise.reject(error);
    }

    // ============ 401 — AUTH EXPIRED ============
    // Only force-logout on protected endpoints
    const isAuthEndpoint = url.includes("/auth/");
    if (status === 401 && !onLoginPage && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("staff");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;
