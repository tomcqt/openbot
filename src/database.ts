import { JSONFile } from 'lowdb/node';
import { Database } from './types';
import path from 'node:path';
import { Low } from 'lowdb';
import fs from 'node:fs';

export async function openDatabase(): Promise<Low<Database>> {
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
  }

  const file = path.join(__dirname, 'data', 'db.json');
  const defaultData: Database = { rooms: [], players: [], tokens: [] };

  // Pass defaultData as the SECOND argument
  const adapter = new JSONFile<Database>(file);
  const db = new Low<Database>(adapter, defaultData);

  await db.read(); // read existing data (if any)

  return db;
}
