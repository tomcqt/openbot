import { Config } from '../types';
import path from 'node:path';
import fs from 'node:fs';

export default class Lang {
  lang: Config['language'];
  logger: Config['logger'];
  data: Record<string, any>;
  config: Config['conf'];
  filePath: string;

  constructor(config: Config) {
    this.lang = config.language;
    this.logger = config.logger;
    this.config = config.conf;
    this.data = {};

    this.filePath = path.join(__dirname, '..', 'lang', `${this.lang}.json`);
    this.#init();
  }

  #init(): void {
    this.logger.log('debug', `Loading language file... (${this.lang})`);
    const fileContents = fs.readFileSync(this.filePath, 'utf-8');
    this.data = JSON.parse(fileContents);
    this.logger.log('debug', 'Language file loaded.');
  }

  /**
   * Gets a language value from the currently loaded language file.
   *
   * @param key The key for the string. Formatted as the JSON path separated by
   *            dots.
   *
   *            Example: `logs.start.in_progress`
   *
   * @param fallback The fallback string that will be used if the key does not exist.
   *
   * @param vars Variables that will replace pieces of the string. These are
   *             formatted as `%%value%%` for values from the `vars` variable,
   *             and `%value%` for values from the `config.toml` file.
   *
   * @returns The final string based on the key and variables set up, or the
   *          fallback if it doesn't exist or something goes wrong.
   */
  get(
    key: string,
    fallback: string = key,
    vars: Record<string, any> = {},
  ): string {
    this.logger.log('debug', `Getting language key: ${key}`);

    const resolvePath = (obj: Record<string, any>, path: string): any => {
      return path.split('.').reduce((acc, part) => {
        if (acc == null) return undefined;
        return acc[part];
      }, obj);
    };

    const replaceVars = (str: string): string => {
      str = str.replace(/%%([^%]+)%%/g, (_, name) => {
        return vars[name] !== undefined ? vars[name] : `%%${name}%%`;
      });

      str = str.replace(/%([^%]+)%/g, (_, path) => {
        const value = resolvePath(this.config, path);
        return value !== undefined ? value : `%${path}%`;
      });

      return str;
    };

    const value = resolvePath(this.data, key);
    if (value === undefined) return fallback;

    if (typeof value === 'string') return replaceVars(value);

    if (Array.isArray(value))
      return value
        .map((v) => (typeof v === 'string' ? replaceVars(v) : v))
        .join('\n');

    return String(value);
  }
}
