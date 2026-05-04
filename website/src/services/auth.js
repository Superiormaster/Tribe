export const setToken = (token) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export function logout() {
  localStorage.removeItem("token")

  if (window.location.pathname.startsWith("/admin")) {
    window.location.href = "/admin/login"
  }
}