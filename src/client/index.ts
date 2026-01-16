import { openDatabase } from '../database';
import { Config, LowDb, Message } from '../types';
import crypto from 'node:crypto';
import Lang from '../bot/lang';
import path from 'node:path';
import Rooms from './rooms';
import sharp from 'sharp';
import Chat from './chat';
import Game from './game';

export default class Client {
  config: Config['conf'];
  logger: Config['logger'];
  rooms: Rooms;
  db: undefined | LowDb;
  chat: Chat;
  language: Lang;
  game: Game;

  constructor(config: Config, lang: Lang) {
    this.config = config.conf;
    this.logger = config.logger;
    this.rooms = new Rooms(config, lang, this);
    this.db = undefined;
    this.chat = new Chat(this);
    this.language = lang;
    this.game = new Game(this);
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

  async parseProfileImage(
    filename: string,
    quality: number = 80
  ): Promise<string> {
    const filePath = path.resolve(filename);

    const buffer = await sharp(filePath)
      .resize(128, 128, { fit: 'fill' }) // exact 128x128
      .flatten({ background: '#ffffff' }) // handle transparency
      .jpeg({ quality })
      .toBuffer();

    return buffer.toString('base64');
  }

  async setup(chatHandler: any, gameHandler: any): Promise<void> {
    await this.rooms.setup(chatHandler, gameHandler);
  }

  parseResponse(response: Message) {
    switch (response.type) {
      case 'message':
        this.chat.send(response.data.text!);
        break;
      case 'error':
        this.chat.send(response.data.text!);
        break;
      default:
        this.chat.send(this.language.get('unknown_response'));
    }
  }
}
