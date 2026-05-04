import { UserProvider } from "@/components-admin/utils/UserContext"
import AdminApp from "@/AdminApp"

export default function AdminRoot() {
  return (
    <UserProvider>
      <AdminApp />
    </UserProvider>
  )
}