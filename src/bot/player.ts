import Bot from './index';
import Lang from './lang';
import Game from '../client/game';
import { Config } from '../types';

export default class Player {
  parent: Bot;
  dictionary: string[];
  logger: Config['logger'];
  game: Game;

  constructor(parent: Bot) {
    this.parent = parent;
    this.logger = parent.logger;
    this.dictionary = this.#getDictionary(this.parent.language);
    this.game = new Game(this.parent.client);
  }

  async handler(type: string, ...data: any[]): Promise<void> {
    this.logger.log('debug', type.toString());
    this.logger.log('debug', JSON.stringify(data));
    if (
      (type == 'setMilestone' && data[0].name == 'seating') ||
      type == 'addPlayer'
    ) {
      this.game.joinRound();
    } else if (
      (type == 'setMilestone' && data[0].name == 'round') ||
      type == 'nextTurn'
    ) {
      if (type == 'setMilestone') {
        this.game.sendWord(this.getBestWord(data[0].syllable));
      } else {
        this.game.sendWord(this.getBestWord(data[1]));
      }
    }
  }

  getBestWord(prompt: string): string {
    return this.dictionary
      .filter((word) => word.startsWith(prompt))
      .sort((a, b) => b.length - a.length)[0];
  }

  #getDictionary(lang: Lang): string[] {
    return require(`../lang/${lang.lang}-words.json`);
  }
}
