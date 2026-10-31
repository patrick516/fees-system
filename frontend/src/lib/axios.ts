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

  // 🎯 Multi-Tenant School Switching
  // If the user is a Group Admin, they can switch schools.
  // We read the selected school from localStorage and send it in the header.
  if (typeof window !== "undefined") {
    const activeSchoolId = localStorage.getItem("activeSchoolId");
    if (activeSchoolId) {
      config.headers["x-active-school-id"] = activeSchoolId;
    }
  }

  return config;
});

// ==================== RESPONSE INTERCEPTOR ====================
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

// 🎯 Redirect to locked screen — but only if we're not already there
const forceLockedRedirect = (status: string) => {
  if (typeof window === "undefined") return;
  const isAlreadyLocked = window.location.pathname.includes("subscription");
  const isAuthPage = ["/login", "/signup", "/platform", "/group"].some((p) =>
    window.location.pathname.startsWith(p),
  );
  if (!isAlreadyLocked && !isAuthPage) {
    // Persist the status so the locked page can show details
    sessionStorage.setItem("subscriptionStatus", status);
    window.location.href = "/subscription-locked";
  }
};

api.interceptors.response.use(
  (response) => {
    // 🎯 Read the subscription header on EVERY successful response
    const subStatus = response.headers["x-subscription-status"];
    if (subStatus && typeof window !== "undefined") {
      const store = useAuthStore.getState();
      const currentStatus = store.staff?.school?.subscriptionStatus;

      if (currentStatus !== subStatus) {
        // Update Zustand without re-rendering everything
        if (store.staff?.school) {
          store.setStaff({
            ...store.staff,
            school: {
              ...store.staff.school,
              subscriptionStatus: subStatus as any,
            },
          });
        }

        //  If transitioned to LOCKED/SUSPENDED, immediately redirect
        if (subStatus === "LOCKED" || subStatus === "SUSPENDED") {
          forceLockedRedirect(subStatus);
        }
      }
    }
    return response;
  },
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

    // ============ 403 — SUBSCRIPTION LOCKED / READONLY ============
    if (status === 403) {
      const code = error.response?.data?.code;
      const subStatus = error.response.headers?.["x-subscription-status"];

      if (
        code === "SUBSCRIPTION_LOCKED" ||
        code === "SUBSCRIPTION_READONLY" ||
        subStatus === "LOCKED" ||
        subStatus === "SUSPENDED"
      ) {
        // Update Zustand to reflect reality
        const store = useAuthStore.getState();
        if (store.staff?.school) {
          store.setStaff({
            ...store.staff,
            school: {
              ...store.staff.school,
              subscriptionStatus: (subStatus || "LOCKED") as any,
            },
          });
        }

        // Force redirect to locked screen
        if (subStatus === "LOCKED" || subStatus === "SUSPENDED") {
          forceLockedRedirect(subStatus);
        }
        return Promise.reject(error);
      }
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
