import Bot from './index';
import Lang from './lang';

export default class Game {
  parent: Bot;
  dictionary: string[];

  constructor(parent: Bot) {
    this.parent = parent;
    this.dictionary = this.#getDictionary(this.parent.language);
  }

  getBestWord(prompt: string): string {
    return this.dictionary
      .filter((word) => word.startsWith(prompt))
      .sort((a, b) => b.length - a.length)[0];
  }

  #getDictionary(lang: Lang): string[] {
    return require(`./lang/${lang.lang}-words.json`);
  }
}
