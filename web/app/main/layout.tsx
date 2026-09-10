"use client";

import { useContext } from "react";
import Navbar from "@/components/Navbar";
import TopNavWrapper from "@/components/TopNavWrapper";
import BottomWrapper from "@/components/BottomWrapper";
import ProtectedRoute from "@/components/ProtectedRoute"
import { NotificationProvider } from "@/components/NotificationContext"
import NotificationToast from "@/components/NotificationToast";
import { AccountSwitcherProvider } from "@/components/AccountSwitcherContext";
import { ShareProvider } from "@/components/share/ShareContext";
import Providers from "@/components/providers";
import { PostUploadProvider } from "@/components/PostUploadProvider";
import { InviteProvider } from "@/components/invite/InviteContext";
import UploadCenter from "@/components/UploadCenter";
import { UserContext } from "@/components/UserContext";

function MainLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useContext(UserContext)!;

  if (!user?.id) {
    return null;
  }

  return (
    <NotificationProvider>
      <PostUploadProvider ownerId={user.id}>
        <ShareProvider>
          <InviteProvider>
            <AccountSwitcherProvider>
              <Providers>

                <div className="relative min-h-screen bg-gray-100 w-full dark:bg-gray-900 overflow-x-hidden">

                  <TopNavWrapper />

                  <div className="relative z-10">

                    <div className="w-full max-w-6xl gap-6">

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

        <UploadCenter />

      </PostUploadProvider>
    </NotificationProvider>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("Parent render");

  return (
    <ProtectedRoute>
      <MainLayoutContent>
        {children}
      </MainLayoutContent>
    </ProtectedRoute>
  );
}