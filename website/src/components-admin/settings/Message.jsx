import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import { io } from "socket.io-client"
import AdminLayout from "../portfolio_admin/AdminLayout"

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("api/admin/messages")
      .then(res => setMessages(res.data));
  }, []);

  useEffect(() => {
    const socket = io("/admin");
    socket.on("new_message", (msg) => {
      setMessages(prev => [msg, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <AdminLayout>
      <div className="bg-gray-900 overflow-hidden space-y-6 border border-rose-100 max-w-4xl mx-auto px-6 py-4 text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">
          Messages
        </h1>
        {messages.length === 0 ? (
          <p className="text-gray-300">No messages yet</p>
        ) : (
          <ul className="space-y-4">
            {messages.map(m => (
              <li key={m.id} className="bg-gray-800 p-4 rounded-lg text-left">
                <strong className="text-cyan-400">{m.email}</strong>
                <p className="text-gray-100">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
         <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-700 text-white rounded"
          >
            ← Back
          </button>
      </div>
    </AdminLayout>
  );
}