'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { apiRequest } from "@/utils/api";

interface NetworkContextType {
  isOnline: boolean;
  serverReachable: boolean;
  socketConnected: boolean;
  canCommunicate: boolean;
  reconnecting: boolean;

  latency: number | null;

  networkStatus:
    | "offline"
    | "poor"
    | "slow"
    | "good";

  connectionType:
    | "wifi"
    | "cellular"
    | "unknown";

  startReconnect: () => void;
  finishReconnect: () => void;
}

const NetworkContext =
  createContext<NetworkContextType>({
    isOnline: true,
    serverReachable: true,
    canCommunicate: true,
    socketConnected: false,
    latency: null,
    networkStatus: "good",
    reconnecting: false,
    connectionType: 'unknown',
    startReconnect: () => {},
    finishReconnect: () => {},
  });

export function NetworkProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [networkStatus, setNetworkStatus] = useState<
    "offline" | "poor" | "slow" | "good"
  >("good");
  const renders = useRef(0);
  renders.current++;
  
  console.log("NetworkProvider", renders.current);
  
  useEffect(() => {
    setMounted(true);
    updateConnection();
  }, []);
  
  const [socketConnected, setSocketConnected] = useState(false);
  
  const [
    connectionType,
    setConnectionType,
  ] = useState<
    "wifi"
    | "cellular"
    | "unknown"
  >("unknown");
  
  const previousReachable =
    useRef(true);

  const [serverReachable,
    setServerReachable] =
    useState(true);

  const [isSlowConnection,
    setIsSlowConnection] =
    useState(false);

  const [reconnecting,
    setReconnecting] =
    useState(false);

  useEffect(() => {
    const onSocketConnected = () => setSocketConnected(true);
    const onSocketDisconnected = () => setSocketConnected(false);
  
    window.addEventListener("socket-connected", onSocketConnected);
    window.addEventListener("socket-disconnected", onSocketDisconnected);
  
    return () => {
      window.removeEventListener("socket-connected", onSocketConnected);
      window.removeEventListener("socket-disconnected", onSocketDisconnected);
    };
  }, []);

  const updateConnection =
    () => {
      const online =
        navigator.onLine;

      setIsOnline(online);

      const connection =
        (
          navigator as any
        ).connection ||
        (
          navigator as any
        ).mozConnection ||
        (
          navigator as any
        ).webkitConnection;

      if (!connection) {
        setIsSlowConnection(false);
        setConnectionType('unknown');
        return;
      }

      const type =
        connection.type === "wifi"
          ? "wifi"
          : connection.type === "cellular"
          ? "cellular"
          : "unknown";
  
      setConnectionType(type);

      const slow =
        connection.effectiveType ===
          'slow-2g' ||
        connection.effectiveType ===
          '2g' ||
        connection.downlink < 1;

      setIsSlowConnection(slow);
    };

  const handleOffline =
    () => {
      setIsOnline(false);
      setServerReachable(false);
      previousReachable.current =
        false;
      setReconnecting(false);
    };

  const handleOnline = async () => {
    updateConnection();
  
    setIsOnline(true);
  
    const ok = await checkServer();
  
    if (!ok) {
      return;
    }
  
    startReconnect();
  
    window.dispatchEvent(
      new Event("network-reconnected")
    );
  };
  
  const startReconnect =
    useCallback(() => {
      setReconnecting(true);
    }, []);
  
  const finishReconnect =
    useCallback(() => {
      setReconnecting(false);
    }, []);
  
  const canCommunicate =
    mounted &&
    isOnline &&
    socketConnected &&
    serverReachable;

  useEffect(() => {
    updateConnection();

    window.addEventListener(
      'online',
      handleOnline
    );

    window.addEventListener(
      'offline',
      handleOffline
    );

    const connection =
      (
        navigator as any
      ).connection ||
      (
        navigator as any
      ).mozConnection ||
      (
        navigator as any
      ).webkitConnection;

    connection?.addEventListener(
      'change',
      updateConnection
    );

    return () => {
      window.removeEventListener(
        'online',
        handleOnline
      );

      window.removeEventListener(
        'offline',
        handleOffline
      );

      connection?.removeEventListener(
        'change',
        updateConnection
      );
    };
  }, []);

  /*
    Detect internet but backend dead.
  */
  const checkServer =
    useCallback(async () => {
      if (!navigator.onLine) {
        setServerReachable(false);
        return false;
      }
      const start = performance.now();

      try {
          const response = await apiRequest("api/users/ping/");
      
          const time = performance.now() - start;
      
          setLatency(time);
      
          if (time < 300) {
              setNetworkStatus("good");
          } else if (time < 1000) {
              setNetworkStatus("slow");
          } else {
              setNetworkStatus("poor");
          }
      
          const ok = response?.status === "ok";
          setServerReachable(ok);
  
          if (
            ok &&
            !previousReachable.current
          ) {
            startReconnect();
          
            window.dispatchEvent(
              new Event(
                "network-reconnected"
              )
            );
          }
  
          previousReachable.current = ok;
          return ok;
      } catch {
          previousReachable.current = false;
          setNetworkStatus("offline");
          setServerReachable(false);
          return false;
      }
    }, []);
  
  useEffect(() => {
    if (!mounted) return;
  
    checkServer();
  
    window.addEventListener(
      "online",
      checkServer
    );
  
    const interval =
      setInterval(
        checkServer,
        10000
      );
  
    return () => {
      clearInterval(interval);
  
      window.removeEventListener(
        "online",
        checkServer
      );
    };
  }, [checkServer, mounted]);
  
  useEffect(() => {
    const disconnected =
      () => {
        setServerReachable(
          false
        );
      };
  
    const connected =
      () => {
        setServerReachable(
          true
        );
      };
  
    window.addEventListener(
      "socket-disconnected",
      disconnected
    );
  
    window.addEventListener(
      "socket-connected",
      connected
    );
  
    return () => {
      window.removeEventListener(
        "socket-disconnected",
        disconnected
      );
  
      window.removeEventListener(
        "socket-connected",
        connected
      );
    };
  }, []);
  
  const value = useMemo(() => ({
    isOnline,
    serverReachable,
    socketConnected,
    canCommunicate,
    latency,
    networkStatus,
    reconnecting,
    connectionType,
    startReconnect,
    finishReconnect,
  }), [
    isOnline,
    serverReachable,
    socketConnected,
    canCommunicate,
    latency,
    networkStatus,
    reconnecting,
    connectionType,
    startReconnect,
    finishReconnect,
  ]);

  return (
    <NetworkContext.Provider
      value={value}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}