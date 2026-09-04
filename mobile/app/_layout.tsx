import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { UserProvider } from "@/components/loading/UserContext";
import GlobalError from "@/components/GlobalError";
import { NetworkProvider } from "@/components/networkConnection/NetworkContext";
import NetworkBannerWrapper from "@/components/networkConnection/NetworkBannerWrapper";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GlobalError>
          <UserProvider>
            <NetworkProvider>
              <StatusBar
                style="auto"
                translucent
              />
  
              <NetworkBannerWrapper />
  
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                }}
              />
            </NetworkProvider>
          </UserProvider>
        </GlobalError>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}