type callState =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "rejected";
  | "failed";