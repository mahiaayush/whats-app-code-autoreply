import pino from 'pino';
import { loadEnv, type EnvConfig } from '@property-ai/config';

export const config: EnvConfig = loadEnv(process.env);

export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
