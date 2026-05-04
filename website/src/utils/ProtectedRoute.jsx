import { Navigate, useLocation } from "react-router-dom"
import { useContext } from "react"
import { UserContext } from "@/utils/UserContext"
import { canAccess } from "@/utils/canAccess"
import { jwtDecode } from "jwt-decode"

export default function ProtectedRoute({ roles, children }) {
  const token = localStorage.getItem("token");
  const location = useLocation()
  const { user } = useContext(UserContext);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  
  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }
  
  let decodedUser;
  try {
    decodedUser = jwtDecode(token); // decode into a new variable
  } catch (err) {
    console.error("Invalid token:", err);
    return <Navigate to="/admin/login" replace />;
  }

  if (roles && !canAccess(decodedUser, roles)) {
    return <Navigate to="/unauthorized" replace />
  }
  
  return children;
}