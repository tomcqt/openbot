import { createLogger, format, Logger, transports } from 'winston';
const { combine, timestamp, label, printf } = format;
import { Format, TransformableInfo } from 'logform';
import fs from 'node:fs';
import Bot from './bot';
import toml from 'toml';

const config: Record<string, any> = toml.parse(
  fs.readFileSync('config.toml', 'utf-8')
);

const logFormat: Format = printf(
  ({ level, message, label, timestamp }: TransformableInfo) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  }
);

const logger: Logger = createLogger({
  level: config.logger?.level || 'info',
  format: combine(label({ label: config.name }), timestamp(), logFormat),
  transports: [new transports.Console()],
});

const bot: Bot = new Bot({
  logger,
  language: 'en',
  conf: config,
});

bot.start();
