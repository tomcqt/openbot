import { Logger } from 'winston';
import { Low } from 'lowdb';

export interface Config {
  logger: Logger;
  conf: Record<string, any>;
  language: string;
}

export type Room = {
  name: string;
  server: string;
  created_at: number;
  roomCode: string;
  isLobby: boolean;
};

export type Player = {
  id: string;
  name: string;
  // TODO: add more fields
};

export type Token = {
  created_at: number;
  token: string;
};

export type Database = {
  rooms: Room[];
  players: Player[];
  tokens: Token[];
};

export type JoinRoomResponse = {
  url: string;
};

export type LowDb = Low<Database>;

export type Command = {
  name: string;
  handler: CommandHandler;
};

export type CommandHandler = (data: Message) => any;

export type Message = {
  type: string;
  data: {
    text?: string;
    nickname?: string;
    picture?: string;
    roles?: string[];
    service?: string;
    authName?: string;
    authId?: number;
    peerId?: number;
  };
};

export type ChatData = {
  nickname: string;
  picture: string;
  roles: string[];
  auth: {
    service: string;
    username: string;
    id: string;
  };
  peerId: number;
};
