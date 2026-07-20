import type { Server } from 'socket.io';
import type { ClientToServerEvents,ServerToClientEvents } from '../../../shared/socket-events.js';

type AppSocketServer=Server<ClientToServerEvents,ServerToClientEvents>;
let socketServer:AppSocketServer|undefined;
export const setSocketServer=(io:AppSocketServer)=>{socketServer=io};
export const getSocketServer=()=>socketServer;
