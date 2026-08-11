'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { connectCommentsSocket } from "@/lib/comment-socket";

const PostSocketContext =
createContext<WebSocket | null>(null);

export function PostSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [socket, setSocket] =
      useState<WebSocket | null>(null);

  useEffect(() => {

    let ws: WebSocket;

    (async () => {
      ws = await connectCommentsSocket();

      if (ws) {
        setSocket(ws);
      }
    })();

    return () => ws?.close();

  }, []);

  return (
    <PostSocketContext.Provider value={socket}>
      {children}
    </PostSocketContext.Provider>
  );
}

export function usePostSocket() {
  return useContext(PostSocketContext);
}