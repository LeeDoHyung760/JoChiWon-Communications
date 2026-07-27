import { env } from './config/env.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/socket-events.js';
import { providerStatus } from './providers/providerFactory.js';
import { registerSocketHandlers } from './socket/registerSocketHandlers.js';
import { setSocketServer } from './socket/socketRuntime.js';
import { apiRouter } from './routes/api.js';
import { directRecommendationsRouter } from './routes/directRecommendations.js';
import { directMeetingPlacesRouter } from './routes/directMeetingPlaces.js';
import { communityRouter } from './routes/community.js';
import { clubsRouter } from './routes/clubs.js';
import { loadedEnvPath } from './loadEnv.js';
import path from 'node:path';

const app = express();
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: '여기 사람 있음' }));
app.use('/api', apiRouter);
app.use('/api/direct-rooms',directRecommendationsRouter);
app.use('/api/direct-rooms',directMeetingPlacesRouter);
app.use('/api/community', communityRouter);
app.use('/api/clubs', clubsRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Request failed:', error instanceof Error ? error.name : 'unknown error');
  res.status(500).json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: env.CLIENT_ORIGIN } });
setSocketServer(io);
io.on('connection', (socket) => registerSocketHandlers(io, socket));
httpServer.listen(env.PORT, () => {
  console.log(`[Config] Environment: ${env.NODE_ENV}`);
  console.log(`[Config] Env file loaded: ${loadedEnvPath?path.relative(process.cwd(),loadedEnvPath):'none'}`);
  console.log(`[Config] AI provider requested: ${providerStatus.ai.requested}`);
  console.log(`[Config] AI provider active: ${providerStatus.ai.active}`);
  console.log(`[Config] Place provider requested: ${providerStatus.place.requested}`);
  console.log(`[Config] Place provider active: ${providerStatus.place.active}`);
  console.log(`[Config] OpenAI key configured: ${providerStatus.ai.configured ? 'yes' : 'no'}`);
  console.log(`[Config] Kakao key configured: ${providerStatus.place.configured ? 'yes' : 'no'}`);
  console.log(`[Config] Mock fallback: ${env.ALLOW_MOCK_FALLBACK ? 'enabled' : 'disabled'}`);
  console.log(`Server: http://localhost:${env.PORT}`);
});
