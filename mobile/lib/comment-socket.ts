import { waitForAccessToken } from "@/utils/api";

const WS_BASE = process.env.EXPO_PUBLIC_WS_URL || "";

export async function connectCommentsSocket(postId: number) {
console.log("[COMMENT WS] WS_BASE:", WS_BASE);

const token = await waitForAccessToken();

if (!token) {
console.error("[COMMENT WS] No access token");
return null;
}

const url =
"${WS_BASE}/ws/comments/${postId}/?token=${encodeURIComponent(token)}";

console.log(
"[COMMENT WS] Connecting:",
url.replace(
/token=[^&]+/,
"token=[REDACTED]"
)
);

const socket = new WebSocket(url);

socket.onopen = () => {
console.log(
"[COMMENT WS] CONNECTED:",
socket.url.replace(
/token=[^&]+/,
"token=[REDACTED]"
)
);

console.log(
  "[COMMENT WS] OPEN:",
  postId
);

};

socket.onclose = (event) => {
console.error("[COMMENT WS] CLOSED:", {
postId,
code: event.code,
reason: event.reason,
clean: event.wasClean,
});
};

socket.onerror = (event) => {
console.error(
"[COMMENT WS] ERROR:",
postId,
event
);
};

return socket;
}