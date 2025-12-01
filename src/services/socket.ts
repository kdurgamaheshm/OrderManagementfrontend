import { io, Socket } from 'socket.io-client';

const socket = io("https://delivery-management-backend-ssl7.onrender.com", { path: "/socket.io" });


export default socket;
