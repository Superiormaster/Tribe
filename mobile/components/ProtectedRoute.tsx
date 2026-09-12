import { useContext, useEffect } from "react";
import { UserContext } from "@/components/UserContext";
import { useNetwork } from "@/components/networkConnection/NetworkContext";
import { useNavigation } from "@/utils/useNavigation";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    authReady,
    authFailed,
    loadingUser,
  } = useContext(UserContext)!;

  const { isOnline } = useNetwork();
  const { replace } = useNavigation();

  useEffect(() => {
    console.log("ProtectedRoute", {
      authReady,
      loadingUser,
      authFailed,
      user,
    });

    // Wait until authentication has finished initializing.
    if (!authReady || loadingUser) return;

    // Do not redirect while the device is offline.
    if (!isOnline) return;

    if (authFailed) {
      console.log("Redirect because authFailed");
      replace("/auth/login");
      return;
    }

    if (!user) {
      console.log("Redirect because user is null");
      replace("/auth/login");
    }
  }, [
    authReady,
    loadingUser,
    authFailed,
    user,
    isOnline,
    replace,
  ]);

  // Keep the protected content hidden while authentication
  // is still being resolved.
  if (!authReady || loadingUser) {
    return null;
  }

  // Prevent protected content from flashing before redirect.
  if (authFailed || !user) {
    return null;
  }

  return children;
}