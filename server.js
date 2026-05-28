import { createServer } from 'http';
import { readFile }     from 'fs/promises';
import { extname, join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync }  from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);


function loadDotEnv() {
  try {
    const envPath = resolve(__dirname, '.env');
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
    console.log('  ✓ .env loaded');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('  ⚠ No .env file found — copy .env.example to .env');
    } else {
      console.warn('  ⚠ Could not read .env:', err.message);
    }
  }
}

loadDotEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Allow all origins in dev (no CORS issues)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /env → sends API key to browser
  if (url.pathname === '/env') {
    const key = process.env.MISTRAL_API_KEY || '';
    if (!key) {
      console.warn('  ✗ /env called but MISTRAL_API_KEY is empty in .env!');
    } else {
      console.log('  → /env served (key: ' + key.slice(0, 8) + '…)');
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({
      MISTRAL_API_KEY: key,
      MISTRAL_MODEL:   process.env.MISTRAL_MODEL || 'mistral-small-latest',
    }));
    return;
  }

  // Static files
  let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  // Block path traversal
  const safePath = resolve(join(__dirname, pathname.replace(/\.\./g, '')));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  try {
    const data = await readFile(safePath);
    const mime = MIME[extname(safePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(err.code === 'ENOENT' ? `404: ${url.pathname}` : `500: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  const key = process.env.MISTRAL_API_KEY || '';
  console.log(` http://${HOST}:${PORT} `);
 
  if (!key) {
    console.log('');
    console.log('  Fix: add MISTRAL_API_KEY=sk-... to your .env file');
    console.log('  Then restart: node server.js');
  }
  console.log('');
});