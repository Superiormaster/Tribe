import { useState } from "react"
import Sidebar from "./Sidebar"

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="px-4 min-h-screen relative">
      {/* Overlay for small screens */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main>
        {/* Mobile menu button */}
        <button
          className="lg:hidden my-4 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        {children}
      </main>
    </div>
  );
}