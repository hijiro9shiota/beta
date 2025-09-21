import test from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, writeJSON } from '../server/lib/db.js';
import { promises as fs } from 'fs';
import path from 'path';

test('writes and reads JSON data consistently', async () => {
  const fileName = 'test-db.json';
  const filePath = path.join(process.cwd(), 'server', 'data', fileName);
  const payload = [{ id: '1', value: 'alpha' }];
  await writeJSON(fileName, payload);
  const loaded = await readJSON(fileName);
  assert.deepEqual(loaded, payload);
  await fs.unlink(filePath);
});
