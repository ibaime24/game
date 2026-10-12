// Vite config: one small addition — a save-file endpoint, so games are written to real files in `saves/`
// (see src/core/saves.js). It runs on both `npm run dev` and `npm run preview`.
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const SAVE_DIR = path.resolve(process.cwd(), 'saves');
const safe = (name) => /^[\w.-]{1,80}$/.test(name) && !name.startsWith('.');

function saveFiles() {
  const handler = (req, res, next) => {
    if (!req.url.startsWith('/__saves')) return next();
    const name = decodeURIComponent(req.url.slice('/__saves'.length).replace(/^\//, '').split('?')[0]);
    const send = (code, body = '') => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(body); };
    try {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
      if (req.method === 'GET' && !name) {
        const files = fs.readdirSync(SAVE_DIR).filter((f) => f.endsWith('.json')).map((f) => ({ name: f.slice(0, -5), text: fs.readFileSync(path.join(SAVE_DIR, f), 'utf8') }));
        return send(200, JSON.stringify(files));
      }
      if (!safe(name)) return send(400, '{"error":"bad save name"}');
      const file = path.join(SAVE_DIR, name + '.json');
      if (req.method === 'DELETE') { fs.rmSync(file, { force: true }); return send(200, '{}'); }
      if (req.method === 'PUT' || req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 50e6) req.destroy(); });
        req.on('end', () => {
          try {
            JSON.parse(body);
            // write to a temporary file first, so a crash mid-write can never leave a half-written save
            fs.writeFileSync(file + '.tmp', body);
            fs.renameSync(file + '.tmp', file);
            send(200, '{}');
          } catch (e) { send(400, JSON.stringify({ error: String(e.message || e) })); }
        });
        return;
      }
      return send(405, '{"error":"method"}');
    } catch (e) {
      return send(500, JSON.stringify({ error: String(e.message || e) }));
    }
  };
  return {
    name: 'oblivion-save-files',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

export default defineConfig({
  plugins: [saveFiles()],
  server: { watch: { ignored: ['**/saves/**'] } },
});
