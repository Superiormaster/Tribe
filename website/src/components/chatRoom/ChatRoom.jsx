import React, { useState, useEffect, useRef } from "react"
import API from "./api"

function ChatRoom({ roomName }) {
  const [messages, setMessages] = useState([]); // {id, username, message, timestamp}
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const access = localStorage.getItem("access");
  if (!access) {
    console.warn("No access token - user may not be authenticated");
  }

  useEffect(() => {
    // load history
    const loadHistory = async () => {
      try {
        const res = await API.get(`/chat/rooms/${roomName}/messages/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        // API returns array of messages: fields id, room_name, user, username, content, timestamp
        const formatted = res.data.map(m => ({
          id: m.id,
          username: m.username,
          message: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(formatted);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };
    loadHistory();

    // open websocket
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://localhost:8000/ws/chat/${roomName}/?token=${access}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // expected: {id, message, username, timestamp}
        setMessages(prev => [...prev, {
          id: data.id,
          username: data.username,
          message: data.message,
          timestamp: data.timestamp,
        }]);
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    ws.onclose = () => console.log("WebSocket closed");
    ws.onerror = (err) => console.error("WebSocket error", err);

    socketRef.current = ws;
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [roomName, access]);

  useEffect(() => {
    // scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ message }));
      setMessage("");
    } else {
      alert("Socket not connected");
    }
  };

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(); // you can customize
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2>Room: {roomName}</h2>

      <div style={{
        border: "1px solid #ddd",
        height: "60vh",
        overflowY: "auto",
        padding: 12,
        borderRadius: 8,
        background: "#fafafa"
      }}>
        {messages.map((m) => (
          <div key={m.id || Math.random()} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#666" }}>
              <strong>{m.username || 'Unknown'}</strong> · <span>{formatTime(m.timestamp)}</span>
            </div>
            <div style={{ padding: "6px 8px", background: "#fff", borderRadius: 6 }}>
              {m.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}/>
      </div>

      <div style={{ display: "flex", marginTop: 12 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
        />
        <button onClick={sendMessage} style={{ marginLeft: 8, padding: "8px 12px" }}>
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatRoom