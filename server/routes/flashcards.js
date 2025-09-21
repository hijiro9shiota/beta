import { readJSON, writeJSON } from '../lib/db.js';
import { buildProviderHook } from '../lib/llm.js';

const provider = buildProviderHook();

export const flashcardRoutes = [
  {
    method: 'POST',
    path: '/api/flashcards',
    handler: async (req, res) => {
      const { sessionId, text, strategy } = req.body;
      if (!sessionId || !text) {
        throw new Error('sessionId and text required');
      }
      const cards = await provider.flashcards(sessionId, text, strategy || 'leitner');
      const flashcards = await readJSON('flashcards.json');
      flashcards.push(...cards);
      await writeJSON('flashcards.json', flashcards);
      res.status(201).json(cards);
    }
  },
  {
    method: 'GET',
    path: '/api/flashcards/:sessionId',
    handler: async (req, res) => {
      const flashcards = await readJSON('flashcards.json');
      res.json(flashcards.filter((card) => card.sessionId === req.params.sessionId));
    }
  }
];
