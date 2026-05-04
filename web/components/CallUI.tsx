import { callState } from "@/lib/callStore"

export default function CallUI({ callState, onAccept, onReject }) {
  if (callState === "idle") return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center">

      {callState === "ringing" && (
        <div className="text-center text-white">
          <div className="animate-pulse text-green-400 text-2xl">
            Incoming Call...
          </div>

          <div className="flex gap-4 mt-6 justify-center">
            <button onClick={onReject} className="bg-red-500 px-4 py-2 rounded-full">
              Reject
            </button>
            <button onClick={onAccept} className="bg-green-500 px-4 py-2 rounded-full">
              Accept
            </button>
          </div>
        </div>
      )}

      {callState === "connecting" && (
        <div className="text-white animate-pulse">
          Connecting...
        </div>
      )}

      {callState === "connected" && (
        <div className="text-white">
          Live Call Active 🔴
        </div>
      )}

      {callState === "reconnecting" && (
        <div className="text-yellow-400 animate-pulse">
          Reconnecting...
        </div>
      )}
    </div>
  );
}