import { Room } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import type { CallState } from "./callStore";

export function useCallManager() {
  const roomRef = useRef<Room | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [participants, setParticipants] = useState<any[]>([]);

  const connectRoom = async (url: string, token: string) => {
    try {
      // Disconnect any previous room
      if (roomRef.current) {
        roomRef.current.disconnect();
      }

      setCallState("connecting");

      const room = new Room();
      roomRef.current = room;

      // Register listeners BEFORE connecting
      room.on("participantConnected", (participant) => {
        setParticipants((prev) => [...prev, participant]);
      });

      room.on("participantDisconnected", (participant) => {
        setParticipants((prev) =>
          prev.filter((p) => p.sid !== participant.sid)
        );
      });

      room.on("disconnected", () => {
        setCallState("ended");
        setParticipants([]);
      });

      room.on("reconnected", () => {
        setCallState("connected");
      });

      await room.connect(url, token);

      // Enable microphone after joining
      await room.localParticipant.setMicrophoneEnabled(true);

      // Populate existing participants
      setParticipants(Array.from(room.remoteParticipants.values()));

      setCallState("connected");
    } catch (error) {
      console.error("Failed to connect room:", error);

      roomRef.current?.disconnect();
      roomRef.current = null;
      setParticipants([]);
      setCallState("ended");

      throw error;
    }
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (!roomRef.current) return;

      if (document.hidden) {
        setCallState("reconnecting");
      } else {
        setCallState("connected");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  const disconnect = () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setParticipants([]);
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