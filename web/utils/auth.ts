import { apiRequest } from "@/utils/api";

export async function logout() {
  const data = await apiRequest("api/users/logout/", {
    method: "POST",
  });

  window.location.href = "/auth/login";
}