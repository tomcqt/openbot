import Client from './index';
import { Socket } from 'socket.io-client';

export default class Chat {
  parent: Client;
  socket: Socket | undefined;

  constructor(parent: Client) {
    this.parent = parent;
    this.socket = undefined;
  }

  #getOrSetSocket() {
    if (!this.socket) this.socket = this.parent.rooms.getChatSocket();
    if (this.socket == null)
      throw new Error(
        'Getting (chat) socket went wrong, socket not yet connected when sending data?'
      );
    return this.socket;
  }

  send(message: string) {
    this.#getOrSetSocket();

    this.socket!.emit('chat', message);
  }
}
