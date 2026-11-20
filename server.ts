import http from 'http';
import path from 'path';
import express from 'express';

const app = express();
const isProd =
  process.env.NODE_ENV === 'production' ||
  import.meta.url.endsWith('server.js');
const PORT = isProd ? Number(process.env.PORT) || 8080 : 3000;

app.use(express.json({ limit: '15mb' }));

function getSupabaseRuntimeConfig() {
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();
  const supabaseAnonKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  return { supabaseUrl, supabaseAnonKey };
}

// Health check endpoint (persistence is handled via Supabase PostgreSQL + IndexedDB)
app.get('/api/health', (_req, res) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseRuntimeConfig();
  res.json({
    status: 'online',
    database: 'Supabase PostgreSQL + IndexedDB',
    supabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    timestamp: Date.now(),
  });
});

// Public client Supabase config bridge (reads runtime env / AI Studio Secrets)
app.get('/api/supabase-config', (_req, res) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseRuntimeConfig();
  res.json({
    supabaseUrl,
    supabaseAnonKey,
  });
});

// Mount Vite middleware in development or serve static build in production
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexHtml = path.resolve(distDir, 'index.html');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtml);
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Ghana Police Service Case Tracker server running on http://0.0.0.0:${PORT} (mode=${isProd ? 'production' : 'development'})`
    );
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
