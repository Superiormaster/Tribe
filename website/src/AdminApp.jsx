import { Routes, Route, Navigate } from "react-router-dom"
import Login from "@/components-admin/auth/Login"
import Dashboard from "@/components-admin/pages/Dashboard"
import Messages from "@/components-admin/settings/Messages"
import ProtectedRoute from "@/utils/ProtectedRoute"
import DeletedItems from "@/components-admin/utils/DeletedItems"
import Settings from "@/components-admin/settings/Settings"
import { UserProvider } from "@/utils/UserContext"

export default function AdminApp() {
  return (
    <UserProvider>
        <div className='bg-gray-900 w-full overflow-hidden transition-opacity duration-700 min-h-screen text-gray-500'>
          <div className='bg-gray-900 text-white'>
            <div className="w-full xl:max-w-[1280px]">
              <Routes>
                {/* PUBLIC */}
                <Route path="/login" element={<Login />} />
  
                {/* PROTECTED */}
                <Route
                  path=""
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
        
              <Route
                path="/settings"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
        
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                />
        
                <Route path="/trash" element={
                <ProtectedRoute>
                  <DeletedItems />
                </ProtectedRoute>
                } 
                />
        
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </div>
          </div>
        </div>
    </UserProvider>
  );
}