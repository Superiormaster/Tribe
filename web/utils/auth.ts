import { apiRequest, setAccessToken } from "@/utils/api";
import { deleteRefreshToken } from "@/lib/keyStore";
import { removeCachedUser } from "@/lib/userCache";

export async function logout() {
  // capture account early (avoid race conditions)
  const selectedAccount = localStorage.getItem("active_account");

  // always try backend logout (don’t block UI cleanup)
  try {
    await apiRequest("api/users/logout/", {
      method: "POST",
    });
  } catch (err) {
    console.warn("Logout API failed, continuing local cleanup...");
  }

  // run cleanup in parallel (faster + safer)
  await Promise.allSettled([
    selectedAccount ? deleteRefreshToken(selectedAccount) : Promise.resolve(),
  ]);
  
  if (selectedAccount) {
    await removeCachedUser(selectedAccount);
  }

  // clear runtime auth state
  setAccessToken(null);

  // clear storage last (after DB cleanup)
  localStorage.removeItem("active_account");

  // notify app (multi-tab support)
  window.dispatchEvent(new Event("auth-changed"));

  // optional: notify other tabs
  localStorage.setItem("logout_event", Date.now().toString());

  // hard redirect (always last)
  window.location.replace("/auth/login");
}