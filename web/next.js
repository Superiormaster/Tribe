const socket = new WebSocket("ws://localhost:8000/ws/notifications/")

socket.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log("New notification:", data.message)
}