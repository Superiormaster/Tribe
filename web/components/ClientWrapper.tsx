"use client";

import { ThemeProvider } from "next-themes";
import { UserProvider } from "@/components/UserContext";
import RouteLoader from "@/components/RouteLoader";
import NProgressInit from "@/components/NProgressInit";
import NetworkBannerWrapper from "@/components/networkConnection/NetworkBannerWrapper";
import {
  NetworkProvider,
} from "@/components/networkConnection/NetworkContext";
import GlobalSocketProvider from "@/components/GlobalSocketProvider";
import { apiRequest } from "@/utils/api";
import { useEffect } from "react";

function AppContent({ children }: { children: React.ReactNode }) {
 
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
        <NetworkProvider>
          <NetworkBannerWrapper />
          <UserProvider>
            <GlobalSocketProvider>
              <AppContent>{children}</AppContent>
            </GlobalSocketProvider>
          </UserProvider>
        </NetworkProvider>
      </ThemeProvider>
    </>
  );
}