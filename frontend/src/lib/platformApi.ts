// frontend/src/lib/platformApi.ts
import axios from "axios";
import { usePlatformAuthStore } from "../store/platformAuthStore";

const platformApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// ==================== REQUEST — attach platform token ====================
platformApi.interceptors.request.use((config) => {
  const token = usePlatformAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==================== RESPONSE — refresh on 401 ====================
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

platformApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const originalRequest = error.config;

    const isAuthEndpoint =
      url.includes("/platform/auth/login") ||
      url.includes("/platform/auth/refresh") ||
      url.includes("/platform/setup");

    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      const { refreshToken, setTokens, logout } =
        usePlatformAuthStore.getState();

      if (!refreshToken) {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/platform/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(platformApi(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        const baseURL = platformApi.defaults.baseURL || "";
        const res = await axios.post(`${baseURL}/platform/auth/refresh`, {
          refreshToken,
        });

        const { token: newAccess, refreshToken: newRefresh } = res.data.data;

        setTokens(newAccess, newRefresh);
        flushQueue(null, newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return platformApi(originalRequest);
      } catch (refreshErr) {
        flushQueue(refreshErr);
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/platform/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default platformApi;
