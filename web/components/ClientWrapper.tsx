"use client";

import { ThemeProvider } from "next-themes";
import { UserProvider, UserContext } from "@/components/UserContext";
import RouteLoader from "@/components/RouteLoader";
import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";

function AppContent({ children }: { children: React.ReactNode }) {
  const context = useContext(UserContext);
  const router = useRouter();
  const { user, loadingUser } = useContext(UserContext)
  
  useEffect(() => {
    const handler = async () => {
      await apiRequest("api/users/me/");
    };
  
    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, []);

  return <main className="flex-1">{children}</main>;
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouteLoader />

      <ThemeProvider attribute="class">
        <UserProvider>
          <AppContent>{children}</AppContent>
        </UserProvider>
      </ThemeProvider>
    </>
  );
}