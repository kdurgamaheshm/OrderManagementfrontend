import { io, Socket } from 'socket.io-client';

const socket: Socket = io('https://delivery-management-backend-ssl7.onrender.com');

export default socket;
