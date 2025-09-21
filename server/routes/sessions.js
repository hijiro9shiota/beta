import { nanoid } from '../lib/nanoid.js';
import { readJSON, writeJSON } from '../lib/db.js';

export const sessionRoutes = [
  {
    method: 'GET',
    path: '/api/sessions',
    handler: async (req, res) => {
      const { sectionId } = req.query;
      const sessions = await readJSON('sessions.json');
      const filtered = sectionId ? sessions.filter((session) => session.sectionId === sectionId) : sessions;
      res.json(filtered);
    }
  },
  {
    method: 'POST',
    path: '/api/sessions',
    handler: async (req, res) => {
      const { title, sectionId, durationSec, markers } = req.body;
      if (!title) {
        throw new Error('Title required');
      }
      const sessions = await readJSON('sessions.json');
      const newSession = {
        id: nanoid(),
        title,
        sectionId,
        startedAt: new Date().toISOString(),
        durationSec: durationSec || 0,
        markers: markers || [],
        transcriptPath: null,
        status: 'draft'
      };
      sessions.push(newSession);
      await writeJSON('sessions.json', sessions);
      res.status(201).json(newSession);
    }
  },
  {
    method: 'GET',
    path: '/api/sessions/:id',
    handler: async (req, res) => {
      const sessions = await readJSON('sessions.json');
      const session = sessions.find((s) => s.id === req.params.id);
      if (!session) {
        throw new Error('Session not found');
      }
      res.json(session);
    }
  },
  {
    method: 'PUT',
    path: '/api/sessions/:id',
    handler: async (req, res) => {
      const sessions = await readJSON('sessions.json');
      let updatedSession;
      const updated = sessions.map((session) => {
        if (session.id === req.params.id) {
          updatedSession = { ...session, ...req.body };
          return updatedSession;
        }
        return session;
      });
      if (!updatedSession) {
        throw new Error('Session not found');
      }
      await writeJSON('sessions.json', updated);
      res.json(updatedSession);
    }
  },
  {
    method: 'DELETE',
    path: '/api/sessions/:id',
    handler: async (req, res) => {
      const sessions = await readJSON('sessions.json');
      const filtered = sessions.filter((session) => session.id !== req.params.id);
      if (filtered.length === sessions.length) {
        throw new Error('Session not found');
      }
      await writeJSON('sessions.json', filtered);
      res.status(204).json({});
    }
  }
];
