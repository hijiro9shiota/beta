import { nanoid } from '../lib/nanoid.js';
import fs from 'fs/promises';
import path from 'path';
import { readJSON, writeJSON } from '../lib/db.js';

export const transcriptRoutes = [
  {
    method: 'POST',
    path: '/api/transcripts',
    handler: async (req, res) => {
      const { sessionId, content } = req.body;
      if (!sessionId || !content) {
        throw new Error('sessionId and content required');
      }
      const filename = `${sessionId}.txt`;
      const filePath = path.join(process.cwd(), 'public', 'transcripts');
      await fs.mkdir(filePath, { recursive: true });
      await fs.writeFile(path.join(filePath, filename), content, 'utf8');
      const transcripts = await readJSON('transcripts.json');
      const record = {
        id: nanoid(),
        sessionId,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        lines: content.split('\n').length,
        createdAt: new Date().toISOString()
      };
      transcripts.push(record);
      await writeJSON('transcripts.json', transcripts);
      const sessions = await readJSON('sessions.json');
      const updated = sessions.map((session) => (session.id === sessionId ? { ...session, transcriptPath: `/public/transcripts/${filename}`, status: 'saved' } : session));
      await writeJSON('sessions.json', updated);
      res.status(201).json(record);
    }
  }
];
