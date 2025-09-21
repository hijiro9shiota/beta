import { nanoid } from '../lib/nanoid.js';
import { createSttMock } from '../lib/stt.js';
import { readJSON, writeJSON } from '../lib/db.js';

const stt = createSttMock();

export const uploadRoutes = [
  {
    method: 'POST',
    path: '/api/uploads/audio',
    handler: async (req, res) => {
      const file = req.file;
      if (!file) {
        throw new Error('Aucun fichier reçu');
      }
      const result = await stt.transcribeBuffer(file.buffer);
      const transcripts = await readJSON('transcripts.json');
      const record = {
        id: nanoid(),
        sessionId: req.fields.sessionId || null,
        sizeBytes: file.buffer.length,
        lines: result.text.split('\n').length,
        createdAt: new Date().toISOString()
      };
      transcripts.push(record);
      await writeJSON('transcripts.json', transcripts);
      res.status(201).json({ transcriptId: record.id, text: result.text });
    }
  }
];
