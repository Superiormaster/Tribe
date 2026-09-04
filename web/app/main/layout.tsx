import Navbar from "@/components/Navbar";
import TopNavWrapper from "@/components/TopNavWrapper";
import BottomWrapper from "@/components/BottomWrapper";
import ProtectedRoute from "@/components/ProtectedRoute"
import { NotificationProvider } from "@/components/NotificationContext"
import NotificationToast from "@/components/NotificationToast";
import { AccountSwitcherProvider } from "@/components/AccountSwitcherContext";
import { ShareProvider } from "@/components/share/ShareContext";
import Providers from "@/components/providers";
import { InviteProvider } from "@/components/invite/InviteContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  console.log("Parent render");
  return (
    <ProtectedRoute>
      <NotificationProvider>

          <ShareProvider>
            <InviteProvider>
              <AccountSwitcherProvider>
                <Providers>
                  {/* ROOT CONTAINER */}
                  <div className="relative min-h-screen bg-gray-100 w-full dark:bg-gray-900 overflow-x-hidden">
          
                    {/* NAVBAR */}
                    <TopNavWrapper />
          
                    {/* PAGE WRAPPER */}
                    <div className="relative z-10">
          
                      <div className="w-full max-w-6xl gap-6">
          
                        {/* CENTER */}
                        <main className="max-w-2xl">
                          {children}
                          <NotificationToast />
                        </main>
          
                      </div>
                    </div>
          
                    <BottomWrapper />
                  </div>
                </Providers>
              </AccountSwitcherProvider>
            </InviteProvider>
          </ShareProvider>

      </NotificationProvider>
    </ProtectedRoute>
  );
}
