import axios, { AxiosRequestConfig } from "axios";
import { getRefreshToken, storeRefreshToken } from "@/lib/keyStore";
import { getFingerprint } from "@/lib/fingerprint";


export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/";

/**
 * We keep access token in memory (NOT localStorage)
 */
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
    "X-Device-Fingerprint": getFingerprint(),
  },
});

/**
 * Attach JWT access token to every request
 */
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Auto refresh like Instagram
 */
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes("/refresh/")) {
      return Promise.reject(error);
    }

    // If no response or not 401 → just fail
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Prevent infinite loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refresh = await getRefreshToken();
      if (!refresh) {
        return Promise.reject(error);
      }

      const res = await apiClient.post("api/users/refresh/", {
        refresh,
      });
      
      const newAccessToken = res.data.access;
      const newRefreshToken = res.data.refresh;
      
      // ✅ IMPORTANT: update stored refresh
      const email = localStorage.getItem("active_account");
      if (email && newRefreshToken) {
        await storeRefreshToken(email, newRefreshToken);
      }
      
      // ✅ update access
      setAccessToken(newAccessToken);

      // Retry original request with new token
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      return apiClient.request(originalRequest);
    } catch (refreshError) {
      // 🔥 Hard logout case
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  }
);

/**
 * Generic API helper
 */
export async function apiRequest(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<any> {
  try {
    if (options.data && !(options.data instanceof FormData)) {
      options.headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
    }

    const response = await apiClient.request({
      url: endpoint,
      ...options,
    });

    return response.data;
  } catch (err: any) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;

      console.error("API ERROR:", status, data);

      const error = new Error("API error");
      (error as any).data = data;

      throw error;
    }

    console.error("FULL ERROR:", err);
  }
}