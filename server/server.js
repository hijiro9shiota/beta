import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sectionRoutes } from './routes/sections.js';
import { sessionRoutes } from './routes/sessions.js';
import { summaryRoutes } from './routes/summaries.js';
import { quizRoutes } from './routes/quizzes.js';
import { flashcardRoutes } from './routes/flashcards.js';
import { transcriptRoutes } from './routes/transcripts.js';
import { uploadRoutes } from './routes/uploads.js';
import { searchRoutes } from './routes/search.js';
import { i18nMiddleware, getDictionaries } from './lib/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const rateMap = new Map();

const routes = [
  ...sectionRoutes,
  ...sessionRoutes,
  ...summaryRoutes,
  ...quizRoutes,
  ...flashcardRoutes,
  ...transcriptRoutes,
  ...uploadRoutes,
  ...searchRoutes
];

const compiledRoutes = routes.map((route) => {
  const keys = [];
  const pattern = route.path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  const regex = new RegExp(`^${pattern}$`);
  return { ...route, regex, keys };
});

function createCoreHandler() {
  return async function handler(req, res) {
    try {
      applySecurityHeaders(res);
      if (handleCors(req, res)) {
        return;
      }
      if (isRateLimited(req)) {
        res.writeHead(429, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Too many requests' }));
        return;
      }
      const url = new URL(req.url, `http://${req.headers.host}`);
      req.query = Object.fromEntries(url.searchParams.entries());
      req.params = {};
      req.body = {};
      req.fields = {};
      req.file = null;

      i18nMiddleware(req, res, () => {});

      if (req.method === 'GET' && url.pathname === '/api/i18n/bootstrap') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ locale: req.locale, dictionaries: getDictionaries() }));
        return;
      }

      if (await serveStatic(url.pathname, res)) {
        return;
      }

      if (req.method === 'GET' && url.pathname === '/') {
        const file = path.join(publicDir, 'index.html');
        const content = await fs.readFile(file);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
        return;
      }

      if (!url.pathname.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      if (['POST', 'PUT'].includes(req.method)) {
        const contentType = req.headers['content-type'] || '';
        const bodyBuffer = await readBody(req);
        if (contentType.includes('application/json')) {
          if (bodyBuffer.length) {
            req.body = JSON.parse(bodyBuffer.toString('utf8'));
          }
        } else if (contentType.startsWith('multipart/form-data')) {
          const boundary = contentType.split('boundary=')[1];
          const parsed = parseMultipart(bodyBuffer, boundary);
          req.fields = parsed.fields;
          req.file = parsed.file;
          req.body = { ...parsed.fields };
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(bodyBuffer.toString('utf8'));
          req.body = Object.fromEntries(params.entries());
        }
      }

      const route = matchRoute(req.method, url.pathname);
      if (!route) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      req.params = route.params;
      const responseWrapper = createResponse(res);
      await route.handler(req, responseWrapper);
    } catch (error) {
      console.error('Server error', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Unexpected error' }));
    }
  };
}

function createServerInstance() {
  return http.createServer(createCoreHandler());
}

function matchRoute(method, pathname) {
  for (const route of compiledRoutes) {
    if (route.method !== method) continue;
    const match = pathname.match(route.regex);
    if (match) {
      const params = {};
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      return { ...route, params };
    }
  }
  return null;
}

async function serveStatic(pathname, res) {
  if (!pathname.startsWith('/public/')) {
    return false;
  }
  const filePath = path.join(process.cwd(), pathname.slice(1));
  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      const content = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': mimeType(filePath) });
      res.end(content);
      return true;
    }
  } catch {
    // ignore missing file
  }
  return false;
}

function mimeType(filePath) {
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.webmanifest')) return 'application/manifest+json';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Permissions-Policy', 'microphone="*"');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
}

function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

function isRateLimited(req) {
  const key = req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000;
  if (!rateMap.has(key)) {
    rateMap.set(key, { count: 1, start: now });
    return false;
  }
  const record = rateMap.get(key);
  if (now - record.start > windowMs) {
    rateMap.set(key, { count: 1, start: now });
    return false;
  }
  record.count += 1;
  if (record.count > 120) {
    return true;
  }
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(buffer, boundary) {
  const result = { fields: {}, file: null };
  if (!boundary) return result;
  const boundaryText = `--${boundary}`;
  const parts = buffer.toString('binary').split(boundaryText).slice(1, -1);
  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;
    const [headerSection, ...rest] = cleaned.split('\r\n\r\n');
    const content = rest.join('\r\n\r\n');
    const headers = headerSection.split('\r\n');
    const disposition = headers.find((line) => line.toLowerCase().startsWith('content-disposition')) || '';
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]*)"/);
    const contentTypeHeader = headers.find((line) => line.toLowerCase().startsWith('content-type')) || '';
    const contentType = contentTypeHeader.split(':')[1]?.trim();
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    const contentBuffer = Buffer.from(content.replace(/\r\n$/, ''), 'binary');
    if (filenameMatch && filenameMatch[1]) {
      result.file = {
        fieldname: fieldName,
        filename: filenameMatch[1],
        mimetype: contentType,
        buffer: contentBuffer
      };
    } else {
      result.fields[fieldName] = contentBuffer.toString('utf8');
    }
  }
  return result;
}

function createResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(payload));
    },
    send(payload, type = 'text/plain') {
      if (!res.headersSent) {
        res.setHeader('Content-Type', type);
      }
      res.end(payload);
    }
  };
}

const server = createServerInstance();
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

export { createServerInstance };
export default server;
