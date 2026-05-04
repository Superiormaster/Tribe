import { useEffect, useRef } from 'react';

const wsRef = useRef<WebSocket | null>(null);

useEffect(() => {
  wsRef.current = new WebSocket(
    `ws://localhost:8000/ws/comments/${post.id}/?token=${token}`
  );

  wsRef.current.onmessage = (e) => {
    const data = JSON.parse(e.data);
    setComments((prev) => [...prev, data]); // add new comment
  };

  wsRef.current.onclose = () => console.log('WebSocket closed');

  return () => {
    wsRef.current?.close();
  };
}, [post.id]);