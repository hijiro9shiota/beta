import { readJSON } from '../lib/db.js';
import fs from 'fs/promises';
import path from 'path';

export const searchRoutes = [
  {
    method: 'GET',
    path: '/api/search',
    handler: async (req, res) => {
      const { q } = req.query;
      if (!q) {
        return res.json({ sessions: [], transcripts: [], summaries: [] });
      }
      const needle = q.toLowerCase();
      const [sessions, transcripts, summaries] = await Promise.all([
        readJSON('sessions.json'),
        readJSON('transcripts.json'),
        readJSON('summaries.json')
      ]);
      const sessionMatches = sessions.filter((session) => session.title.toLowerCase().includes(needle));
      const transcriptMatches = [];
      const transcriptMeta = new Map(transcripts.map((entry) => [entry.sessionId, entry]));
      for (const session of sessions) {
        if (!session.transcriptPath) continue;
        const abs = path.join(process.cwd(), session.transcriptPath.replace('/public/', 'public/'));
        try {
          const content = await fs.readFile(abs, 'utf8');
          if (content.toLowerCase().includes(needle)) {
            const meta = transcriptMeta.get(session.id);
            transcriptMatches.push({ sessionId: session.id, excerpt: extractExcerpt(content, needle), lines: meta?.lines || 0 });
          }
        } catch {
          // ignore missing files
        }
      }
      const summaryMatches = summaries
        .filter((summary) => summary.contentMD.toLowerCase().includes(needle))
        .map((summary) => ({ sessionId: summary.sessionId, level: summary.level, excerpt: extractExcerpt(summary.contentMD, needle) }));
      res.json({ sessions: sessionMatches, transcripts: transcriptMatches, summaries: summaryMatches });
    }
  }
];

function extractExcerpt(text, needle) {
  const index = text.toLowerCase().indexOf(needle);
  if (index === -1) return text.slice(0, 180);
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + needle.length + 60);
  return text.slice(start, end);
}
