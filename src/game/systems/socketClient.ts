import { io,Socket } from 'socket.io-client';import type { ClientToServerEvents,ServerToClientEvents } from '../../../shared/socket-events';
export const socket:Socket<ServerToClientEvents,ClientToServerEvents>=io(import.meta.env.VITE_SOCKET_URL??'http://localhost:3001',{autoConnect:false});
