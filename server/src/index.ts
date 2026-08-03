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
import { festivalsRouter } from './routes/festivals.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { authRouter } from './routes/auth.js';
import { loadCampusFeaturePortalPositions, seedCampusFeaturePortalPositions } from './models/CampusFeaturePortal.js';
import { roomStore } from './rooms/roomStore.js';
import { placeRecommendationsRouter } from './routes/placeRecommendations.js';
import { accountRouter } from './routes/account.js';
import { authenticatedUserIdFromCookie } from './middleware/authenticatedUser.js';
import { UserModel } from './models/User.js';
import { profileRouter } from './routes/profile.js';
import { jointCampusRecommendationsRouter } from './routes/jointCampusRecommendations.js';
import { loadOrSeedWorldRespawnPosition } from './models/WorldRespawnPosition.js';
import { FIXED_LAKE_RESPAWN } from '../../shared/socket-events.js';
import { chungnyeongRouter } from './routes/chungnyeong.js';

const app = express();
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: '여기 사람 있음' }));
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);
app.use('/api/festivals',festivalsRouter);
app.use('/api/direct-rooms',directRecommendationsRouter);
app.use('/api/direct-rooms',directMeetingPlacesRouter);
app.use('/api/community', communityRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/ai', placeRecommendationsRouter);
app.use('/api/ai', jointCampusRecommendationsRouter);
app.use('/api/account', accountRouter);
app.use('/api/profile', profileRouter);
app.use('/api/chungnyeong', chungnyeongRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'REQUEST_TOO_LARGE', message: '요청 본문이 너무 큽니다.' } });
  }
  console.error('Request failed:', error instanceof Error ? error.name : 'unknown error');
  return res.status(500).json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: env.CLIENT_ORIGIN, credentials: true } });
setSocketServer(io);
io.use(async (socket, next) => {
  const userId = authenticatedUserIdFromCookie(socket.request.headers.cookie);
  if (!userId) return next();
  const user = await UserModel.findById(userId).select('ageGroup profile.chatEnabled profile.recordVisibility').lean().catch(() => null);
  if (user) {
    socket.data.userId = String(user._id);
    socket.data.ageGroup = user.ageGroup;
    socket.data.chatEnabled = user.profile?.chatEnabled !== false;
    socket.data.recordVisibility = user.profile?.recordVisibility === 'private' ? 'private' : 'public';
  }
  return next();
});
io.on('connection', (socket) => registerSocketHandlers(io, socket));

let shuttingDown = false;
let campusPortalSyncTimer:NodeJS.Timeout|undefined;
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  if(campusPortalSyncTimer)clearInterval(campusPortalSyncTimer);
  console.log(`[Server] ${signal} received; shutting down`);

  if (httpServer.listening) {
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }

  await disconnectDatabase();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

const startServer = async (): Promise<void> => {
  await connectDatabase();
  roomStore.setRespawnPosition(await loadOrSeedWorldRespawnPosition(FIXED_LAKE_RESPAWN));
  roomStore.replaceCampusFeaturePortalPositions(await seedCampusFeaturePortalPositions(roomStore.allCampusFeaturePortalPositions()));
  let campusPortalSignature=JSON.stringify(roomStore.allCampusFeaturePortalPositions().sort((a,b)=>a.portal.localeCompare(b.portal)));
  campusPortalSyncTimer=setInterval(()=>{void loadCampusFeaturePortalPositions().then(positions=>{
    if(!positions.length)return;
    const merged=new Map(roomStore.allCampusFeaturePortalPositions().map(position=>[position.portal,position]));
    positions.forEach(position=>merged.set(position.portal,position));
    const next=[...merged.values()].sort((a,b)=>a.portal.localeCompare(b.portal)),signature=JSON.stringify(next);
    if(signature===campusPortalSignature)return;
    campusPortalSignature=signature;roomStore.replaceCampusFeaturePortalPositions(next);io.emit('campusFeaturePortalPositionsUpdated',next);
  }).catch(error=>console.error('[campus portal sync failed]',error))},1500);

  httpServer.listen(env.PORT, () => {
    console.log(`[Config] Environment: ${env.NODE_ENV}`);
    console.log(
      `[Config] Env file loaded: ${
        loadedEnvPath
          ? path.relative(process.cwd(), loadedEnvPath)
          : 'none'
      }`,
    );
    console.log(
      `[Config] AI provider requested: ${providerStatus.ai.requested}`,
    );
    console.log(
      `[Config] AI provider active: ${providerStatus.ai.active}`,
    );
    console.log(
      `[Config] Place provider requested: ${providerStatus.place.requested}`,
    );
    console.log(
      `[Config] Place provider active: ${providerStatus.place.active}`,
    );
    console.log(
      `[Config] OpenAI key configured: ${
        providerStatus.ai.configured ? 'yes' : 'no'
      }`,
    );
    console.log(
      `[Config] Kakao key configured: ${
        providerStatus.place.configured ? 'yes' : 'no'
      }`,
    );
    console.log(
      `[Config] Mock fallback: ${
        env.ALLOW_MOCK_FALLBACK ? 'enabled' : 'disabled'
      }`,
    );
    console.log(`Server: http://localhost:${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error(
    '[Server] Failed to start:',
    error instanceof Error ? error.message : error,
  );

  process.exit(1);
});
