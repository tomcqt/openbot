import Bot from './index';
import fs from 'node:fs';
import path from 'node:path';
import { Command, Message, ChatData } from '../types';
import { Logger } from 'winston';

export default class Commands {
  bot: Bot;
  commands: Record<string, Command>;
  logger: Logger;

  constructor(bot: Bot) {
    this.bot = bot;
    this.commands = {};
    this.logger = bot.logger;

    this.#init();
  }

  #init() {
    const files = fs.readdirSync(path.join(__dirname, 'commands'));
    for (const file of files) {
      const command = require(path.join(__dirname, 'commands', file));
      this.commands[command.default.name] = command.default;
    }
    this.logger.log(
      'debug',
      `Loaded ${Object.keys(this.commands).length} commands`
    );
    this.logger.log('debug', JSON.stringify(this.commands));
  }

  get(name: string) {
    return this.commands[name];
  }

  run(name: string, data: Message) {
    const command = this.get(name);
    if (!command)
      return {
        type: 'error',
        data: {
          text: this.bot.language.get('command_not_found', undefined, { name }),
        },
      };
    return command.handler(data);
  }

  parseChat(data: ChatData, text: string): Message {
    this.logger.log('debug', `${data.nickname}: ${text}`);
    let out: Message = {
      type: 'message',
      data: {
        text: text,
        nickname: data.nickname,
        picture: data.picture,
        roles: data.roles,
        peerId: data.peerId,
      },
    };

    if (data.auth) {
      out.data.service = data.auth.service;
      out.data.authName = data.auth.username;
      out.data.authId = parseInt(data.auth.id);
    }

    return out;
  }
}
