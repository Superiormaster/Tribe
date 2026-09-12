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
import {
  DeviceEventEmitter,
  View,
} from "react-native";
import {
  useColorScheme,
} from "nativewind";

function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const subscription =
      DeviceEventEmitter.addListener(
        "media_resource_error",
        (event) => {
          if (
            event?.message?.includes?.(
              "media resource was aborted"
            )
          ) {
            return;
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View className="flex-1">
      {children}
    </View>
  );
}

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setColorScheme } =
    useColorScheme();

  useEffect(() => {
    setColorScheme("system");
  }, [setColorScheme]);

  return (
    <View className="flex-1">
      <NProgressInit />

      <RouteLoader />

      <NetworkProvider>
        <NetworkBannerWrapper />

        <UserProvider>
          <GlobalSocketProvider>
            <AppContent>
              {children}
            </AppContent>
          </GlobalSocketProvider>
        </UserProvider>
      </NetworkProvider>
    </View>
  );
}