import Navbar from "@/components/Navbar";
import TopNavWrapper from "@/components/TopNavWrapper";
import BottomWrapper from "@/components/BottomWrapper";
import ProtectedRoute from "@/components/ProtectedRoute"
import { NotificationProvider } from "@/components/NotificationContext"
import NotificationToast from "@/components/NotificationToast";
import GlobalSocketProvider from "@/components/GlobalSocketProvider";
import { AccountSwitcherProvider } from "@/components/AccountSwitcherContext";
import { ShareProvider } from "@/components/share/ShareContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  console.log("Parent render");
  return (
    <ProtectedRoute>
      <NotificationProvider>
        <GlobalSocketProvider />

        <ShareProvider>
          <AccountSwitcherProvider>
            {/* ROOT CONTAINER */}
            <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
    
              {/* NAVBAR */}
              <TopNavWrapper />
    
              {/* PAGE WRAPPER */}
              <div className="flex justify-center relative z-10">
    
                <div className="w-full max-w-6xl flex gap-6">
    
                  {/* CENTER */}
                  <main className="flex-1 max-w-2xl">
                    {children}
                    <NotificationToast />
                  </main>
    
                </div>
              </div>
    
              <BottomWrapper />
            </div>
          </AccountSwitcherProvider>
        </ShareProvider>

      </NotificationProvider>
    </ProtectedRoute>
  );
}
