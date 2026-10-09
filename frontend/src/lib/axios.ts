import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== RESPONSE INTERCEPTOR ====================
// Queue for concurrent requests while a refresh is in progress
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const flushQueue = (err: any, token: string | null = null) => {
  pendingQueue.forEach((p) => {
    if (err) p.reject(err);
    else if (token) p.resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const originalRequest = error.config;

    // ============ 429 — RATE LIMITED ============
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

    // ============ 401 — ATTEMPT REFRESH ============
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/staff/logout");

    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const baseURL = api.defaults.baseURL || "";
        const res = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { token: newAccess, refreshToken: newRefresh } = res.data.data;

        setTokens(newAccess, newRefresh);
        flushQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        flushQueue(refreshErr);
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ============ OTHER 401s — FORCE LOGOUT ============
    if (status === 401 && !isAuthEndpoint) {
      const { logout } = useAuthStore.getState();
      logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
