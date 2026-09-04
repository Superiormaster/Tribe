import axios, { AxiosRequestConfig, AxiosHeaders } from "axios";
import {
  getRefreshToken,
  storeRefreshToken,
} from "@/lib/keyStore";

import { getFingerprint } from "@/lib/fingerprint";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL;

let accessToken: string | null = null;

let isRefreshing = false;

let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (
  cb: (token: string) => void
) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const setAccessToken = (
  token: string | null
) => {
  accessToken = token;
};

export const waitForAccessToken = async () => {
  let tries = 0;

  while (!accessToken && tries < 20) {
    await new Promise((res) =>
      setTimeout(res, 200)
    );

    tries++;
  }

  return accessToken;
};

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
    "X-Device-Fingerprint": getFingerprint(),
  },
});

/**
 * Attach access token
 */
apiClient.interceptors.request.use(
  async (config) => {

    const token =
      accessToken ||
      await waitForAccessToken();

    if (token) {

      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      
      config.headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    return config;
  }
);

/**
 * Auto refresh
 */
apiClient.interceptors.response.use(
  (res) => res,

  async (error) => {
    const originalRequest = error.config;

    // ignore refresh endpoint itself
    if (
      originalRequest?.url?.includes(
        "/api/users/refresh/"
      )
    ) {
      return Promise.reject(error);
    }

    // only handle 401
    if (
      !error.response ||
      error.response.status !== 401
    ) {
      return Promise.reject(error);
    }

    // prevent infinite loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    /**
     * WAIT if already refreshing
     */
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          (originalRequest.headers as AxiosHeaders).set(
            "Authorization",
            `Bearer ${token}`
          );

          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const selected =
        localStorage.getItem(
          "active_account"
        );

      if (!selected) {
        throw new Error(
          "No active account"
        );
      }

      const refresh =
        await getRefreshToken(selected);

      if (!refresh) {
        throw new Error(
          "No refresh token"
        );
      }

      /**
       * REFRESH TOKEN
       */
      const res = await axios.post(
        `${API_URL}api/users/refresh/`,
        {
          refresh,
        },
        {
          headers: {
            "X-Device-Fingerprint":
              getFingerprint(),
          },
        }
      );

      const newAccessToken =
        res.data.access;

      const newRefreshToken =
        res.data.refresh;

      /**
       * SAVE TOKENS
       */
      setAccessToken(
        newAccessToken
      );

      if (newRefreshToken) {
        await storeRefreshToken(
          selected,
          newRefreshToken
        );
      }

      /**
       * RELEASE QUEUE
       */
      onRefreshed(
        newAccessToken
      );

      /**
       * RETRY ORIGINAL REQUEST
       */
      (originalRequest.headers as AxiosHeaders).set(
        "Authorization",
        `Bearer ${newAccessToken}`
      );

      return apiClient(
        originalRequest
      );

    } catch (refreshError) {

      console.error(
        "Refresh failed",
        refreshError
      );

      /**
       * HARD LOGOUT
       */
      setAccessToken(null);

      localStorage.removeItem(
        "active_account"
      );

      window.dispatchEvent(
        new Event("force-home")
      );

      if (
        window.location.pathname !==
        "/auth/login"
      ) {
        window.location.href = "/auth/login";
      }

      return Promise.reject(
        refreshError
      );

    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Generic request helper
 */
export async function apiRequest(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<any> {

  try {

    if (
      options.data &&
      !(options.data instanceof FormData)
    ) {
      options.headers = {
        "Content-Type":
          "application/json",
        ...(options.headers || {}),
      };
    }
  
    const response =
      await apiClient.request({
        url: endpoint,
        ...options,
      });
  
    {/*console.log("🌐 API REQUEST:", {
      url: endpoint,
      method: options.method,
      data: options.data,
    });
    
    console.log("🌐 API RESPONSE:", response.data);
    console.log("🌐 RESPONSE TYPE:", typeof response.data);
    console.log(
      "🌐 RESPONSE IS ARRAY:",
      Array.isArray(response.data)
    );*/}

    return response.data;

  } catch (err: any) {

    if (err.response) {

      console.error(
        "API ERROR:",
        err.response.status,
        err.response.data
      );

      throw {
        status: err.response.status,
        ...err.response.data,
      };
    }

    console.error("FULL ERROR:", err);
    console.log("========== AXIOS ERROR ==========");
    console.dir(err);
    console.log("name:", err.name);
    console.log("message:", err.message);
    console.log("code:", err.code);
    console.log("response:", err.response);
    console.log("request:", err.request);
    console.log("config:", err.config);
    console.log("toJSON:", err.toJSON?.());

    throw err;
  }
}