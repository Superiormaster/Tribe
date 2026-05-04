import Navbar from "@/components/Navbar";
import TopNavWrapper from "@/components/TopNavWrapper";
import BottomWrapper from "@/components/BottomWrapper";
import ProtectedRoute from "@/components/ProtectedRoute"
import { NotificationProvider } from "@/components/NotificationContext"
import NotificationToast from "@/components/NotificationToast";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <NotificationProvider>

        {/* ROOT CONTAINER */}
        <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">

          {/* NAVBAR */}
          <TopNavWrapper />

          {/* PAGE WRAPPER */}
          <div className="flex justify-center pt-20 pb-20 relative z-10">

            <div className="w-full max-w-6xl flex gap-6">

              {/* LEFT SIDEBAR */}
              <aside className="hidden lg:block w-64 sticky top-20 h-[calc(100vh-5rem)]">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                  Left Sidebar
                </div>
              </aside>

              {/* CENTER */}
              <main className="flex-1 max-w-2xl">
                {children}
                <NotificationToast />
              </main>

              {/* RIGHT SIDEBAR */}
              <aside className="hidden xl:block w-72 sticky top-20 h-[calc(100vh-5rem)]">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                  Right Sidebar
                </div>
              </aside>

            </div>
          </div>

          <BottomWrapper />
        </div>

      </NotificationProvider>
    </ProtectedRoute>
  );
}
