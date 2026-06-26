import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { handleApiRequest } from './server/api.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function start() {
  let vite;
  try {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: 'spa',
    });
  } catch (error) {
    console.error('Vite is not installed. Run npm install, then npm run web --workspace apps/web.');
    console.error(error.message);
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    if (req.url?.startsWith('/api/')) {
      try {
        const result = await handleApiRequest({
          method: req.method || 'GET',
          url: req.url,
          body: await readBody(req),
        });
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(result.body));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || String(error) }));
      }
      return;
    }
    vite.middlewares(req, res);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`AI PM Dev Workbench: http://127.0.0.1:${port}`);
  });
}

start();
