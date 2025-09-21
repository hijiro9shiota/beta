import { readJSON, writeJSON } from '../lib/db.js';
import { buildProviderHook } from '../lib/llm.js';

const provider = buildProviderHook();

export const summaryRoutes = [
  {
    method: 'POST',
    path: '/api/summaries',
    handler: async (req, res) => {
      const { sessionId, level, text } = req.body;
      if (!sessionId || !text) {
        throw new Error('sessionId and text required');
      }
      const summary = await provider.summarize(sessionId, text, level || 'global');
      const summaries = await readJSON('summaries.json');
      summaries.push(summary);
      await writeJSON('summaries.json', summaries);
      res.status(201).json(summary);
    }
  },
  {
    method: 'GET',
    path: '/api/summaries/:sessionId',
    handler: async (req, res) => {
      const summaries = await readJSON('summaries.json');
      res.json(summaries.filter((s) => s.sessionId === req.params.sessionId));
    }
  }
];
