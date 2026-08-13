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

import { apiRequest } from '@/utils/api';

type NetworkStatus =
  | 'offline'
  | 'poor'
  | 'slow'
  | 'good';

type ConnectionType =
  | 'wifi'
  | 'cellular'
  | 'unknown';

interface NetworkContextType {
  isOnline: boolean;
  serverReachable: boolean;
  socketConnected: boolean;
  canCommunicate: boolean;
  reconnecting: boolean;

  latency: number | null;

  networkStatus: NetworkStatus;

  connectionType: ConnectionType;

  startReconnect: () => void;
  finishReconnect: () => void;
}

const NetworkContext =
  createContext<NetworkContextType>({
    isOnline: false,
    serverReachable: false,
    socketConnected: false,
    canCommunicate: false,
    reconnecting: false,

    latency: null,

    networkStatus: 'offline',

    connectionType: 'unknown',

    startReconnect: () => {},
    finishReconnect: () => {},
  });

export function NetworkProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mounted, setMounted] =
    useState(false);

  const [isOnline, setIsOnline] =
    useState(false);

  const [serverReachable, setServerReachable] =
    useState(false);

  const [socketConnected, setSocketConnected] =
    useState(false);

  const [reconnecting, setReconnecting] =
    useState(false);

  const [latency, setLatency] =
    useState<number | null>(null);

  const [networkStatus, setNetworkStatus] =
    useState<NetworkStatus>('offline');

  const [connectionType, setConnectionType] =
    useState<ConnectionType>('unknown');

  const checkGenerationRef =
    useRef(0);

  const reconnectingRef =
    useRef(false);

  const wasReachableRef =
    useRef(false);

  const reconnectEventFiredRef =
    useRef(false);

  const updateConnection =
    useCallback(() => {
      if (
        typeof navigator === 'undefined'
      ) {
        return;
      }

      const online =
        navigator.onLine;

      setIsOnline(online);

      if (!online) {
        setNetworkStatus('offline');
        return;
      }

      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (!connection) {
        setConnectionType('unknown');
        return;
      }

      const type =
        connection.type === 'wifi'
          ? 'wifi'
          : connection.type === 'cellular'
          ? 'cellular'
          : 'unknown';

      setConnectionType(type);

      const effectiveType =
        connection.effectiveType;

      const downlink =
        Number(connection.downlink);

      const isSlow =
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        (
          Number.isFinite(downlink) &&
          downlink > 0 &&
          downlink < 1
        );

      if (isSlow) {
        setNetworkStatus('slow');
      }
    }, []);

  const startReconnect =
    useCallback(() => {
      reconnectingRef.current = true;
      setReconnecting(true);
    }, []);

  const finishReconnect =
    useCallback(() => {
      reconnectingRef.current = false;
      setReconnecting(false);
    }, []);

  const checkServer =
    useCallback(async () => {
      if (
        typeof navigator === 'undefined'
      ) {
        return false;
      }

      if (!navigator.onLine) {
        checkGenerationRef.current++;

        setIsOnline(false);
        setServerReachable(false);
        setNetworkStatus('offline');

        wasReachableRef.current = false;

        return false;
      }

      const generation =
        ++checkGenerationRef.current;

      const start =
        performance.now();

      try {
        const response =
          await apiRequest(
            'api/users/ping/'
          );

        if (
          generation !==
          checkGenerationRef.current
        ) {
          return false;
        }

        if (!navigator.onLine) {
          setIsOnline(false);
          setServerReachable(false);
          setNetworkStatus('offline');

          wasReachableRef.current =
            false;

          return false;
        }

        const elapsed =
          performance.now() - start;

        const rounded =
          Math.round(elapsed / 100) * 100;

        const status: NetworkStatus =
          elapsed < 300
            ? 'good'
            : elapsed < 1000
            ? 'slow'
            : 'poor';

        const ok =
          response?.status === 'ok';

        const wasReachable =
          wasReachableRef.current;

        setIsOnline(true);

        setLatency(
          rounded
        );

        setNetworkStatus(
          status
        );

        setServerReachable(
          ok
        );

        wasReachableRef.current =
          ok;

        if (
          ok &&
          !wasReachable &&
          !reconnectEventFiredRef.current
        ) {
          reconnectEventFiredRef.current =
            true;

          startReconnect();

          window.dispatchEvent(
            new Event("network:available")
          );
          window.dispatchEvent(
            new Event(
              'network-reconnected'
            )
          );
        }

        if (!ok) {
          reconnectEventFiredRef.current =
            false;
          wasReachableRef.current =
            false;
        }

        return ok;

      } catch (error) {
        if (
          generation !==
          checkGenerationRef.current
        ) {
          return false;
        }

        wasReachableRef.current =
          false;
        reconnectEventFiredRef.current =
          false;

        setServerReachable(
          false
        );

        if (
          !navigator.onLine
        ) {
          setIsOnline(false);
          setNetworkStatus(
            'offline'
          );
        } else {
          setIsOnline(true);
          setNetworkStatus(
            'poor'
          );
        }

        return false;
      }
    }, [
      startReconnect,
    ]);

  const handleOffline =
    useCallback(() => {
      checkGenerationRef.current++;
      wasReachableRef.current =
        false;
      reconnectEventFiredRef.current =
        false;
      reconnectingRef.current =
        false;
      setIsOnline(false);
      setServerReachable(false);
      setReconnecting(false);

      setNetworkStatus(
        'offline'
      );

      window.dispatchEvent(
        new Event(
          'network-offline'
        )
      );
    }, []);

  const handleOnline =
    useCallback(async () => {
      updateConnection();
      setIsOnline(true);
      setServerReachable(false);

      const ok =
        await checkServer();

      if (!ok) {
        return;
      }

    }, [
      updateConnection,
      checkServer,
    ]);
  
  useEffect(() => {
    setMounted(true);

    updateConnection();

    if (
      navigator.onLine
    ) {
      checkServer();
    } else {
      handleOffline();
    }

    window.addEventListener(
      'online',
      handleOnline
    );

    window.addEventListener(
      'offline',
      handleOffline
    );

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

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
  }, [
    updateConnection,
    checkServer,
    handleOnline,
    handleOffline,
  ]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const interval =
      setInterval(() => {
        if (
          navigator.onLine
        ) {
          checkServer();
        }
      }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [
    mounted,
    checkServer,
  ]);

  useEffect(() => {
    const handleSocketConnected =
      () => {
        setSocketConnected(true);
      };

    const handleSocketDisconnected =
      () => {
        setSocketConnected(false);
      };

    window.addEventListener(
      'socket-connected',
      handleSocketConnected
    );

    window.addEventListener(
      'socket-disconnected',
      handleSocketDisconnected
    );

    return () => {
      window.removeEventListener(
        'socket-connected',
        handleSocketConnected
      );

      window.removeEventListener(
        'socket-disconnected',
        handleSocketDisconnected
      );
    };
  }, []);

  const canCommunicate =
    mounted &&
    isOnline &&
    serverReachable;

  const value =
    useMemo(
      () => ({
        isOnline,
        serverReachable,
        socketConnected,
        canCommunicate,
        reconnecting,
        latency,
        networkStatus,
        connectionType,
        startReconnect,
        finishReconnect,
      }),
      [
        isOnline,
        serverReachable,
        socketConnected,
        canCommunicate,
        reconnecting,
        latency,
        networkStatus,
        connectionType,
        startReconnect,
        finishReconnect,
      ]
    );

  return (
    <NetworkContext.Provider
      value={value}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(
    NetworkContext
  );
}