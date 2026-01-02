import { openDatabase } from '../database';
import { Config, LowDb } from '../types';
import crypto from 'node:crypto';
import Lang from '../bot/lang';
import Rooms from './rooms';

export default class Client {
  config: Config['conf'];
  logger: Config['logger'];
  rooms: Rooms;
  db: undefined | LowDb;

  constructor(config: Config, lang: Lang) {
    this.config = config.conf;
    this.logger = config.logger;
    this.rooms = new Rooms(config, lang, this);
    this.db = undefined;
  }

  async getUserToken(): Promise<string> {
    if (!this.db) this.db = await openDatabase();

    this.logger.log('debug', 'Getting user token');

    if (this.db.data!.tokens.length > 0) {
      const existing = this.db.data!.tokens[0].token;
      this.db.data!.tokens.filter((t: any) => t.token === existing);
      if (existing.length === 16) {
        this.logger.log('debug', 'Using existing token');
        return existing;
      }
    }

    const bytes = crypto.randomBytes(16);
    let token = '';

    for (let i = 0; i < 16; i++) {
      token +=
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-'[
          bytes[i] % 64
        ];
    }

    this.db.data!.tokens.push({
      created_at: Date.now(),
      token: token,
    });
    this.db.write();

    this.logger.log('debug', 'Created new token');

    return token;
  }
}
