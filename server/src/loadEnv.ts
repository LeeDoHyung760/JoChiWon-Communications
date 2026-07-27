import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';

const candidates = [
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(process.cwd(), '.env'),
];

const envPath = candidates.find((candidate) => existsSync(candidate));
if (envPath) dotenv.config({ path: envPath, override: false, quiet: true });

export const loadedEnvPath = envPath;
