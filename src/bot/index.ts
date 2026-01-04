import { openDatabase } from '../database';
import { Config, ChatData } from '../types';
import Client from '../client';
import Lang from './lang';
import Commands from './commands';

export default class Bot {
  logger: Config['logger'];
  language: Lang;
  config: Config['conf'];
  db: any;
  client: Client;
  lobby: {
    code: string | undefined;
    server: string | undefined;
  };
  commands: Commands;

  constructor(config: Config) {
    this.logger = config.logger;
    this.language = new Lang(config);
    this.config = config.conf;
    this.db = null;
    this.client = new Client(config, this.language);
    this.lobby = {
      code: undefined,
      server: undefined,
    };
    this.commands = new Commands(this);
  }

  async #init(): Promise<void> {
    this.logger.info(this.language.get('logs.start.in_progress'));

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

    await this.client.setup(this.chat.bind(this), undefined);
  }

  async start(): Promise<void> {
    await this.#init();
    this.logger.info(
      this.language.get('logs.start.done', undefined, {
        ms: process.uptime() * 1000,
      })
    );
    this.logger.info(
      this.language.get('logs.join', undefined, {
        code: this.lobby.code,
      })
    );
  }

  async chat(data: ChatData, text: string): Promise<void> {
    const message = this.commands.parseChat(data, text);
    if (message.data.nickname === this.config.bot.username) return;
    if (message.data.text!.startsWith('.')) {
      const command = message.data.text!.slice(1).split(' ')[0];
      const response = this.commands.run(command, message);
      this.client.parseResponse(response);
    }
  }
}
