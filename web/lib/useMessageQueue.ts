import { useRef } from "react";

export function useMessageQueue(socketRef: any, setMessages: any) {
  const queueRef = useRef<any[]>([]);
  const processingRef = useRef(false);

  const QUEUE_KEY = "chat_queue";

  const saveQueue = () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queueRef.current));
  };

  const loadQueue = () => {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  };

  const addToQueue = (msg: any) => {
    queueRef.current.push(msg);
    saveQueue();
  };

  const processQueue = async () => {
    if (processingRef.current) return;

    processingRef.current = true;

    const queue = loadQueue();

    for (let i = 0; i < queue.length; i++) {
      const msg = queue[i];

      try {
        await new Promise((resolve, reject) => {
          socketRef.current.emit("send_message", msg, (ack: any) => {
            if (ack?.ok) resolve(true);
            else reject();
          });
        });

        queue.splice(i, 1);
        i--;
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

      } catch {
        break; // stop retry loop
      }
    }

    processingRef.current = false;
  };

  const startQueueProcessor = () => {
    setInterval(() => {
      processQueue();
    }, 3000);
  };

  return {
    addToQueue,
    startQueueProcessor,
  };
}