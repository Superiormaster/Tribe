// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom"
import AdminRoot from "@/AdminRoot"
import PublicApp from "./PublicApp"

export default function App() {
  return (
    <Routes>
      {/* PUBLIC WEBSITE */}
      <Route path="/*" element={<PublicApp />} />

      {/* ADMIN DASHBOARD */}
      <Route path="/admin/*" element={<AdminRoot />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}