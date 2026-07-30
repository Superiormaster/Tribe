import axios, {
  AxiosHeaders,
  AxiosRequestConfig,
} from "axios";

import {
  getRefreshToken,
  storeRefreshToken,
  getActiveAccount,
  clearActiveAccount,
} from "@/lib/keyStore";

import { getFingerprint } from "@/lib/fingerprint";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

let accessToken: string | null = null;

let isRefreshing = false;

let refreshSubscribers: ((token: string) => void)[] =
  [];

const subscribeTokenRefresh = (
  cb: (token: string) => void
) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) =>
    cb(token)
  );

  refreshSubscribers = [];
};

export const setAccessToken = (
  token: string | null
) => {
  accessToken = token;
};

export const waitForAccessToken =
  async () => {
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
  },
});

/**
 * REQUEST INTERCEPTOR
 */
apiClient.interceptors.request.use(
  async (config) => {
    const fingerprint =
      await getFingerprint();

    if (!config.headers) {
      config.headers =
        new AxiosHeaders();
    }

    config.headers.set(
      "X-Device-Fingerprint",
      fingerprint
    );

    const token =
      accessToken ||
      (await waitForAccessToken());

    if (token) {
      config.headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    return config;
  }
);

/**
 * RESPONSE INTERCEPTOR
 */
apiClient.interceptors.response.use(
  (res) => res,

  async (error) => {
    const originalRequest =
      error.config;

    if (
      originalRequest?.url?.includes(
        "/api/users/refresh/"
      )
    ) {
      return Promise.reject(error);
    }

    if (
      !error.response ||
      error.response.status !== 401
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    /**
     * ALREADY REFRESHING
     */
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh(
          (token) => {
            (
              originalRequest.headers as AxiosHeaders
            ).set(
              "Authorization",
              `Bearer ${token}`
            );

            resolve(
              apiClient(originalRequest)
            );
          }
        );
      });
    }

    isRefreshing = true;

    try {
      const selected =
        await getActiveAccount();

      if (!selected) {
        throw new Error(
          "No active account"
        );
      }

      const refresh =
        await getRefreshToken(
          selected
        );

      if (!refresh) {
        throw new Error(
          "No refresh token"
        );
      }

      const fingerprint =
        await getFingerprint();

      const res = await axios.post(
        `${API_URL}api/users/refresh/`,
        {
          refresh,
        },
        {
          headers: {
            "X-Device-Fingerprint":
              fingerprint,
          },
        }
      );

      const newAccessToken =
        res.data.access;

      const newRefreshToken =
        res.data.refresh;

      setAccessToken(
        newAccessToken
      );

      if (newRefreshToken) {
        await storeRefreshToken(
          selected,
          newRefreshToken
        );
      }

      onRefreshed(
        newAccessToken
      );

      (
        originalRequest.headers as AxiosHeaders
      ).set(
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

      await clearActiveAccount();

      /**
       * Navigation should be handled
       * by AuthContext
       */

      return Promise.reject(
        refreshError
      );
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * REQUEST HELPER
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

    return response.data;
  } catch (err: any) {
    if (err.response) {
      console.error(
        "API ERROR:",
        err.response.status,
        err.response.data
      );

      throw {
        status:
          err.response.status,
        ...err.response.data,
      };
    }

    console.error(
      "FULL ERROR:",
      err
    );

    throw err;
  }
}

export default apiClient;