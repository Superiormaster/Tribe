import { apiRequest, setAccessToken }
from "@/utils/api"

import {
  getRefreshToken,
  storeRefreshToken
} from "@/lib/keyStore"
import NProgress from "nprogress";

export const switchAccount =
  async (email: string) => {
  NProgress.start();

  localStorage.setItem(
    "active_account",
    email
  )

  const refresh =
    await getRefreshToken(email)

  if (!refresh) {
    NProgress.done();
    window.location.href =
      "/auth/login"

    return
  }

  const res = await apiRequest(
    "api/users/refresh/",
    {
      method: "POST",
      data: { refresh },
    }
  )

  setAccessToken(res.access)

  if (res.refresh) {
    await storeRefreshToken(
      email,
      res.refresh
    )
  }

  window.dispatchEvent(
    new Event("auth-changed")
  )
}