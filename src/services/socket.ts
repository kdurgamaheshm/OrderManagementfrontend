// frontend: src/services/socket.ts
import { io } from "socket.io-client";

const rawApi = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
// remove trailing slash and remove /api if present
const BACKEND = rawApi.replace(/\/+$/, "").replace(/\/api$/i, "");

console.log("Socket connecting to backend:", BACKEND);

const socket = io(BACKEND, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  autoConnect: true,
});

export default socket;
