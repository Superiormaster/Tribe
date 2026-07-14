"use client";

import { ThemeProvider } from "next-themes";
import { UserProvider, UserContext } from "@/components/UserContext";
import RouteLoader from "@/components/RouteLoader";
import NProgressInit from "@/components/NProgressInit";
import NetworkBannerWrapper from "@/components/networkConnection/NetworkBannerWrapper";
import {
  NetworkProvider,
} from "@/components/networkConnection/NetworkContext";
import { apiRequest } from "@/utils/api";
import { useContext, useEffect } from "react";

function AppContent({ children }: { children: React.ReactNode }) {
  const context = useContext(UserContext);
  const { user, loadingUser } = useContext(UserContext)!
  
  useEffect(() => {
    const handler = async () => {
      try {
        const profile = await apiRequest(
          "api/users/me/"
        )
  
        context?.setUser(profile)
  
      } catch (err) {
        console.error(err)
      }
    }
  
    window.addEventListener(
      "auth-changed",
      handler
    )
  
    return () => {
      window.removeEventListener(
        "auth-changed",
        handler
      )
    }
  }, [context])
 
  useEffect(() => {

    const handler = (event: ErrorEvent) => {
  
      if (
        event?.message?.includes?.("media resource was aborted")
      ) {
        event.preventDefault();
      }
    };
  
    window.addEventListener("error", handler);
  
    return () => {
      window.removeEventListener("error", handler);
    };
  
  }, []);

  return <main className="flex-1">{children}</main>;
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NProgressInit />
      <RouteLoader />

      <ThemeProvider attribute="class">
        <UserProvider>
          <NetworkProvider>
            <NetworkBannerWrapper />
            <AppContent>{children}</AppContent>
          </NetworkProvider>
        </UserProvider>
      </ThemeProvider>
    </>
  );
}