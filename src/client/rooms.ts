import { Config, JoinRoomResponse, Room } from '../types';
import { io, Socket } from 'socket.io-client';
import { openDatabase } from '../database';
import { IncomingMessage } from 'http';
import Lang from '../bot/lang';
import Client from './index';
import axios from 'axios';
import https from 'https';

export default class Rooms {
  config: Config['conf'];
  logger: Config['logger'];
  db: any;
  gameSocket: any;
  chatSocket: any;
  lang: Lang;
  parent: Client;

  constructor(config: Config, lang: Lang, parent: Client) {
    this.config = config.conf;
    this.logger = config.logger;
    this.lang = lang;
    this.db = undefined;
    this.gameSocket = undefined;
    this.chatSocket = undefined;
    this.parent = parent;
  }

  async create(
    name: string = this.config.client.room_name,
    isLobby: boolean = false
  ): Promise<unknown> {
    if (!this.db) this.db = await openDatabase();

    const data = JSON.stringify({
      creatorUserToken: await this.parent.getUserToken(),
      gameId: 'bombparty',
      isPublic: true,
      name: name,
    });

    const urlParts = new URL(this.config.client.server_url);

    const parsedData = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: urlParts.hostname,
          port: 443,
          path: urlParts.pathname + '/startRoom',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        },
        (res) => {
          res.setEncoding('utf8');
          let rawData = '';

          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', async () => {
            try {
              const parsed = JSON.parse(rawData);
              this.logger.log(
                'debug',
                'Room created with code ' + parsed.roomCode
              );

              const roomCode = parsed.roomCode;
              const serverUrl = parsed.url;

              this.db.data!.rooms.push({
                name: name,
                server: serverUrl,
                created_at: Date.now(),
                roomCode: roomCode,
                isLobby: isLobby,
              });

              await this.db.write();

              resolve({
                name: name,
                server: serverUrl,
                created_at: Date.now(),
                roomCode: roomCode,
              });
            } catch (e) {
              if (e instanceof Error) {
                this.logger.error(
                  'Failed to parse room response: ' + e.message
                );
                reject(e);
              } else {
                this.logger.error('Failed to parse room response: ' + e);
                reject(e);
              }
            }
          });
        }
      );

      req.on('error', (e) => {
        this.logger.error(`Problem with request: ${e.message}`);
        reject(e);
      });

      req.write(data);
      req.end();
    });

    return parsedData;
  }

  async check(room: Room): Promise<boolean> {
    if (!this.db) this.db = await openDatabase();

    return await new Promise((resolve, reject) => {
      https.get(
        this.config.client.server_url + '/rooms',
        (res: IncomingMessage) => {
          let rawData: string = '';

          res.on('data', (chunk) => {
            rawData += chunk.toString();
          });

          res.on('end', () => {
            try {
              const data = JSON.parse(rawData); // parse once, full JSON

              data.publicRooms.filter((r: any) => {
                if (r.roomCode === room.roomCode) {
                  resolve(true);
                }
              });

              resolve(false);
            } catch (err) {
              console.error('Failed to parse JSON:', err);
            }
          });

          res.on('error', (err: Error) => {
            console.error('Request error:', err);
          });
        }
      );
    });
  }

  async #connectToRoom(options: {
    roomCode: string;
    userToken: string;
    nickname: string;
    language: string;
    server?: string | undefined;
  }) {
    const { roomCode, userToken, nickname, language } = options;

    const picture = await this.parent.parseProfileImage(
      this.config.bot.profile_image
    );

    let serverURL;
    if (!options.server) {
      const response = await axios.post<JoinRoomResponse>(
        'https://jklm.fun/api/joinRoom',
        { roomCode }
      );

      serverURL = response.data?.url;
      if (!serverURL) {
        throw new Error('Invalid room code');
      }
    } else {
      serverURL = options.server;
    }

    const chatSocket: Socket = io(serverURL, {
      transports: ['websocket'],
      reconnection: true,
    });

    const gameSocket: Socket = io(serverURL, {
      transports: ['websocket'],
      reconnection: true,
      autoConnect: false,
    });

    await new Promise<void>((resolve) => {
      chatSocket.once('connect', () => {
        chatSocket.emit(
          'joinRoom',
          { roomCode, userToken, nickname, language, picture },
          () => {
            resolve();
          }
        );
      });
    });

    gameSocket.connect();

    await new Promise<void>((resolve) => {
      gameSocket.once('connect', () => {
        gameSocket.emit('joinGame', 'bombparty', roomCode, userToken);
        resolve();
      });
    });

    return {
      chatSocket,
      gameSocket,
    };
  }

  async join(
    code: string,
    server: string | undefined = undefined
  ): Promise<void> {
    const { chatSocket, gameSocket } = await this.#connectToRoom({
      roomCode: code,
      userToken: await this.parent.getUserToken(),
      nickname: this.config.bot.username,
      language: this.lang.get('language', 'en-US'),
      server: server,
    });

    this.chatSocket = chatSocket;
    this.gameSocket = gameSocket;
  }

  async setup(chatHandler: Function, gameHandler: Function): Promise<void> {
    if (!this.chatSocket || !this.gameSocket) {
      throw new Error('Chat or game socket not connected');
    }
    this.chatSocket.on('chat', chatHandler);
    this.gameSocket.on('game', gameHandler);
  }

  getChatSocket(): Socket {
    if (!this.chatSocket) {
      throw new Error('Chat socket not connected');
    }
    return this.chatSocket;
  }

  getGameSocket(): Socket {
    if (!this.gameSocket) {
      throw new Error('Game socket not connected');
    }
    return this.gameSocket;
  }
}
