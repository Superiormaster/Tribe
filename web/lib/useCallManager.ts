import { Room } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from '@/utils/api';

export function useCallManager() {
  const roomRef = useRef<Room | null>(null);

  const [callState, setCallState] = useState("idle");
  const [participants, setParticipants] = useState<any[]>([]);
  
  const connectRoom = async (url: string, token: string) => {
    setCallState("connecting");
  
    // 🎤 ask permission ONLY when call starts
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  
    const room = new Room();
    roomRef.current = room;
  
    room.on("participantConnected", (p) => {
      setParticipants(prev => [...prev, p]);
    });
  
    room.on("participantDisconnected", (p) => {
      setParticipants(prev => prev.filter(x => x.sid !== p.sid));
    });
  
    room.on("disconnected", () => {
      setCallState("reconnecting");
    });
  
    room.on("reconnected", () => {
      setCallState("connected");
    });
  
    await room.connect(url, token);
  
    setCallState("connected");
  };
  
  useEffect(() => {
    const handleVisibility = () => {
      if (!roomRef.current) return;
  
      if (document.hidden) {
        setCallState("reconnecting");
  
        // LiveKit equivalent of ICE restart
        roomRef.current.engine?.restartIce?.();
      }
    };
  
    document.addEventListener("visibilitychange", handleVisibility);
  
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const disconnect = async () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setCallState("ended");
  };

  return {
    room: roomRef,
    callState,
    participants,
    connectRoom,
    disconnect,
    setCallState,
  };
}