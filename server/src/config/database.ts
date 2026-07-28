import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);

    console.log('[Database] MongoDB connected');
  } catch (error) {
    console.error(
      '[Database] MongoDB connection failed:',
      error instanceof Error ? error.message : error,
    );

    throw error;
  }
};