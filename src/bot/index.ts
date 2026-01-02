import { openDatabase } from '../database';
import { Config } from '../types';
import Client from '../client';
import Lang from './lang';

export default class Bot {
  logger: Config['logger'];
  lang: Lang;
  config: Config['conf'];
  db: any;
  client: Client;
  lobby: {
    code: string | undefined;
    server: string | undefined;
  };

  constructor(config: Config) {
    this.logger = config.logger;
    this.lang = new Lang(config);
    this.config = config.conf;
    this.db = null;
    this.client = new Client(config, this.lang);
    this.lobby = {
      code: undefined,
      server: undefined,
    };
  }

  async #init(): Promise<void> {
    this.logger.info(this.lang.get('logs.start.in_progress'));

    this.logger.log('debug', 'Connecting to database');
    this.db = await openDatabase();
    this.logger.log('debug', 'Database connected');

    this.logger.log('debug', 'Checking for existing rooms');
    const rooms = this.db.data!.rooms;
    if (rooms.length === 0) {
      this.logger.log('debug', 'No existing rooms found, creating room.');
      const room: any = await this.client.rooms.create(
        this.config.client.room_name,
        true
      );
      this.lobby.code = room.roomCode;
      this.lobby.server = room.server;
    } else {
      this.logger.log('debug', 'Existing rooms found, skipping room creation.');
      this.logger.log('debug', 'Checking room status');
      for (const room of rooms) {
        const status: boolean = await this.client.rooms.check(room);
        if (status) {
          this.logger.log('debug', `Room ${room.roomCode} exists.`);
          if (room.isLobby) {
            this.logger.log(
              'debug',
              `Room ${room.roomCode} is a lobby, joining.`
            );
            this.lobby.code = room.roomCode;
            this.lobby.server = room.server;
          }
        } else {
          this.logger.log('debug', `Room ${room.roomCode} no longer exists.`);
          this.db.data!.rooms = this.db.data!.rooms.filter(
            (r: any) => r.roomCode !== room.roomCode
          );
          await this.db.write();
        }
      }
      if (this.db.data!.rooms.length === 0) {
        this.logger.log('debug', 'No existing rooms found, creating room.');
        const room: any = await this.client.rooms.create(
          this.config.client.room_name,
          true
        );
        this.lobby.code = room.roomCode;
        this.lobby.server = room.server;
      }
    }
    this.logger.log('debug', 'Database updated');

    this.logger.log('debug', 'Joining lobby');
    await this.client.rooms.join(this.lobby.code!, this.lobby.server!);
    this.logger.log('debug', 'Joined lobby');
  }

  async start(): Promise<void> {
    await this.#init();
    this.logger.info(
      this.lang.get('logs.start.done', undefined, {
        ms: process.uptime() * 1000,
      })
    );
    this.logger.info(
      this.lang.get('logs.join', undefined, {
        code: this.lobby.code,
      })
    );
  }
}
