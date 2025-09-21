import { promises as fs } from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
const locks = new Map();

function resolveFile(name) {
  if (!name.endsWith('.json')) {
    throw new Error('DB access limited to JSON files');
  }
  return path.join(dataDir, name);
}

async function ensureFileExists(file) {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, '[]', 'utf8');
  }
}

async function withLock(file, fn) {
  const previous = locks.get(file) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => (release = resolve));
  locks.set(file, previous.then(() => current));
  try {
    await previous;
    const result = await fn();
    release();
    return result;
  } catch (err) {
    release();
    throw err;
  } finally {
    if (locks.get(file) === current) {
      locks.delete(file);
    }
  }
}

export async function readJSON(name) {
  const file = resolveFile(name);
  await ensureFileExists(file);
  return withLock(file, async () => {
    const raw = await fs.readFile(file, 'utf8');
    try {
      return JSON.parse(raw || '[]');
    } catch (error) {
      console.error('Failed to parse JSON', name, error);
      throw error;
    }
  });
}

export async function writeJSON(name, data) {
  const file = resolveFile(name);
  await ensureFileExists(file);
  return withLock(file, async () => {
    const temp = `${file}.tmp-${Date.now()}`;
    await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(temp, file);
  });
}

export async function pushJSON(name, record) {
  const collection = await readJSON(name);
  collection.push(record);
  await writeJSON(name, collection);
  return record;
}

export async function updateJSON(name, predicate, updater) {
  const collection = await readJSON(name);
  let changed = false;
  const updated = collection.map((item) => {
    if (predicate(item)) {
      changed = true;
      return updater(item);
    }
    return item;
  });
  if (!changed) {
    throw new Error('Record not found');
  }
  await writeJSON(name, updated);
  return updated;
}

export async function removeJSON(name, predicate) {
  const collection = await readJSON(name);
  const filtered = collection.filter((item) => !predicate(item));
  if (filtered.length === collection.length) {
    throw new Error('Record not found');
  }
  await writeJSON(name, filtered);
  return filtered;
}
