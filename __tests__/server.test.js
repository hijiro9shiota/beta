import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerInstance } from '../server/server.js';

async function withServer(fn) {
  return new Promise((resolve, reject) => {
    const instance = createServerInstance();
    instance.listen(0, async () => {
      const { port } = instance.address();
      try {
        await fn(port);
        instance.close(resolve);
      } catch (error) {
        instance.close(() => reject(error));
      }
    });
  });
}

test('GET /api/sections returns sections', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://localhost:${port}/api/sections`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(Array.isArray(payload));
  });
});

test('POST /api/summaries creates summary record', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://localhost:${port}/api/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'sess-maths-1', text: 'Contenu pédagogique pour résumé.' })
    });
    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.ok(payload.contentMD);
  });
});
