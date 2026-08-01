import mongoose from 'mongoose';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { MongoMemoryServer as MongoMemoryServerInstance } from 'mongodb-memory-server';
import { env } from './env.js';

let embeddedMongo: MongoMemoryServerInstance | undefined;

const startEmbeddedMongo = async (): Promise<string> => {
  const dbPath = localDatabasePath();
  await mkdir(dbPath, { recursive: true });

  console.log(
    `[Database] Starting embedded local MongoDB at ${dbPath}`,
  );

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  embeddedMongo = await MongoMemoryServer.create({
    instance: {
      dbName: 'jochwon',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });
  return embeddedMongo.getUri('jochwon');
};

const localDatabasePath = () => {
  const serverRoot =
    path.basename(process.cwd()) === 'server'
      ? process.cwd()
      : path.resolve(process.cwd(), 'server');

  return path.join(serverRoot, '.data', 'mongodb');
};

export const connectDatabase = async (): Promise<void> => {
  let uri = env.MONGODB_URI;

  try {
    if (!uri) {
      if (env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI is required in production');
      }

      uri = await startEmbeddedMongo();
    }

    try {
      await mongoose.connect(uri, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 8_000,
      });
    } catch (error) {
      if (embeddedMongo || env.NODE_ENV === 'production') throw error;

      console.warn(
        '[Database] External MongoDB unavailable; using embedded local MongoDB for development',
      );
      await mongoose.disconnect().catch(() => undefined);
      uri = await startEmbeddedMongo();
      await mongoose.connect(uri, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 8_000,
      });
    }

    console.log(
      `[Database] MongoDB connected (${embeddedMongo ? 'embedded local' : 'external'}, database: ${mongoose.connection.name})`,
    );
  } catch (error) {
    if (embeddedMongo) {
      await embeddedMongo.stop({ doCleanup: false }).catch(() => undefined);
      embeddedMongo = undefined;
    }

    console.error(
      '[Database] MongoDB connection failed:',
      error instanceof Error ? error.message : error,
    );

    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();

  if (embeddedMongo) {
    await embeddedMongo.stop({ doCleanup: false });
    embeddedMongo = undefined;
    console.log('[Database] Embedded local MongoDB stopped');
  }
};
