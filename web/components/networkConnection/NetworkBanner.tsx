'use client';

import { useEffect, useState } from "react";
import { useNetwork } from "./NetworkContext";

export default function NetworkBanner() {
    const {
        isOnline,
        reconnecting,
        serverReachable,
        socketConnected,
        latency,
        networkStatus,
    } = useNetwork();

    const [visible, setVisible] = useState(false);

    let message = "";
    let color = "";
    
    if (!isOnline) {
        message = "⚫ Offline";
        color = "bg-red-600";
    } else if (!serverReachable) {
        message = "🔴 Network Unavailable";
        color = "bg-red-500";
    } else if (!socketConnected) {
        message = "🟡 Connecting...";
        color = "bg-yellow-500";
    } else if (reconnecting) {
        message = "🔄 Reconnecting...";
        color = "bg-yellow-500";
    } else if (networkStatus === "poor") {
        message = `🔴 Poor Network • ${Math.round(latency ?? 0)}ms`;
        color = "bg-red-600";
    } else if (networkStatus === "slow") {
        message = `🟡 Slow Network • ${Math.round(latency ?? 0)}ms`;
        color = "bg-orange-500";
    } else {
        message = "🟢 You are online";
        color = "bg-green-600";
    }

    useEffect(() => {
        if (!message) {
            setVisible(false);
            return;
        }

        setVisible(true);

        const timer = setTimeout(() => {
            setVisible(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, [message]);

    if (!visible) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[99999] ${color} text-white text-center py-2 transition-all duration-300`}
        >
            {message}
        </div>
    );
}