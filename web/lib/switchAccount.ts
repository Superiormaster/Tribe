import { apiRequest, setAccessToken }
from "@/utils/api"

import {
  getRefreshToken,
  storeRefreshToken
} from "@/lib/keyStore"

export const switchAccount =
  async (email: string) => {

  localStorage.setItem(
    "active_account",
    email
  )

  const refresh =
    await getRefreshToken(email)

  if (!refresh) {
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

  window.location.href =
    "/main/home"
}