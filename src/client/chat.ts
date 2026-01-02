import Client from './index';
import { Socket } from 'socket.io-client';

export default class Chat {
  parent: Client;
  socket: Socket | undefined;

  constructor(parent: Client) {
    this.parent = parent;
    this.socket = undefined;
  }

  send(message: string) {
    if (!this.socket) this.socket = this.parent.rooms.getChatSocket();
    if (this.socket == null) return;
    this.socket.emit('chat', message);
  }
}
