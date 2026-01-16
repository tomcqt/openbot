import { Socket } from 'socket.io-client';
import Client from './index';

export default class Game {
  parent: Client;
  socket: Socket | undefined;

  constructor(parent: Client) {
    this.parent = parent;
    this.socket = undefined;
  }

  #getOrSetSocket() {
    if (!this.socket) this.socket = this.parent.rooms.getGameSocket();
    if (this.socket == null)
      throw new Error(
        'Getting (game) socket went wrong, socket not yet connected when sending data?'
      );
    return this.socket;
  }

  joinRound(): void {
    this.#getOrSetSocket();

    this.socket!.emit('joinRound');
  }

  sendWord(word: string): void {
    this.#getOrSetSocket();

    this.socket!.emit('setWord', word, true);
  }
}
