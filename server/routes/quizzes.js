import { readJSON, writeJSON } from '../lib/db.js';
import { buildProviderHook } from '../lib/llm.js';

const provider = buildProviderHook();

export const quizRoutes = [
  {
    method: 'POST',
    path: '/api/quizzes',
    handler: async (req, res) => {
      const { sessionId, text, n } = req.body;
      if (!sessionId || !text) {
        throw new Error('sessionId and text required');
      }
      const quiz = await provider.quiz(sessionId, text, n || 5);
      const quizzes = await readJSON('quizzes.json');
      quizzes.push(quiz);
      await writeJSON('quizzes.json', quizzes);
      res.status(201).json(quiz);
    }
  },
  {
    method: 'GET',
    path: '/api/quizzes/:sessionId',
    handler: async (req, res) => {
      const quizzes = await readJSON('quizzes.json');
      res.json(quizzes.filter((q) => q.sessionId === req.params.sessionId));
    }
  }
];
