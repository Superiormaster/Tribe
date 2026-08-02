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
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const firedReconnect = useRef(false);
  
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

  const updateConnection =
    () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
  
      timeout.current = setTimeout(() => {
        const online =
          navigator.onLine;
  
        setIsOnline(prev => prev === online ? prev : online);
  
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
  
        setConnectionType(prev =>
          prev === type ? prev : type
        );
  
        const slow =
          connection.effectiveType ===
            'slow-2g' ||
          connection.effectiveType ===
            '2g' ||
          connection.downlink < 1;
  
        setIsSlowConnection(prev =>
          prev === slow ? prev : slow
        );
      }, 500);
    };

  const handleOffline =
    () => {
      setIsOnline(prev => prev ? false : prev);
      setServerReachable(prev => prev ? false : prev);
      setReconnecting(prev => prev ? false : prev);
      previousReachable.current =
        false;
    };

  const handleOnline = async () => {
    updateConnection();
  
    setIsOnline(prev => prev === true ? prev : true);
  
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
          const rounded = Math.round(time / 100) * 100;

          const status =
              time < 300
                  ? "good"
                  : time < 1000
                  ? "slow"
                  : "poor";

          setLatency(prev =>
              prev === rounded ? prev : rounded
          );
      
          setNetworkStatus(prev =>
            prev === status ? prev : status
          );
      
          const ok = response?.status === "ok";
          setServerReachable(prev =>
            prev === ok ? prev : ok
          );

          if (ok && !previousReachable.current && !firedReconnect.current) {
              firedReconnect.current = true;
          
              startReconnect();
          
              window.dispatchEvent(
                  new Event("network-reconnected")
              );
          }
          
          if (!ok) {
              firedReconnect.current = false;
          }

          previousReachable.current = ok;
          return ok;
      } catch {
          previousReachable.current = false;
          setNetworkStatus(prev =>
            prev === "offline" ? prev : "offline"
          );
          setServerReachable(prev =>
            prev ? false : prev
          );
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
        60000 
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
        setServerReachable(prev =>
          prev ? false : prev
        );
      };
  
    const connected =
      () => {
        setServerReachable(prev =>
          prev === true ? prev : true
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
  
  useEffect(() => {
    return () => clearTimeout(timeout.current!);
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