import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("parent_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const onLoginPage =
      typeof window !== "undefined" && window.location.pathname === "/";

    // Only force-logout on 401 from auth endpoints (login/refresh).
    // Other 401s (e.g. a background poll on a route the parent can't reach)
    // should NOT wipe the session — they just fail silently.
    const isAuthEndpoint = url.includes("/auth/");

    if (status === 401 && isAuthEndpoint && !onLoginPage) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("parent_token");
        localStorage.removeItem("parent_student");
        localStorage.removeItem("parent-auth");
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
