import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * In sviluppo (npm run dev) fa rispondere anche le funzioni server in /api,
 * così il sito locale si comporta come quello su Vercel.
 * Di default in locale i salvataggi vanno sui file della cartella (LOCAL_FS=1),
 * senza toccare GitHub né il sito online.
 */
function localApi(): Plugin {
  return {
    name: 'barbe-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) return next();
        const name = url.slice(5).split(/[?/#]/)[0];
        if (!/^[a-z-]+$/.test(name)) { res.statusCode = 404; return res.end(); }
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          await mod.default(req, res);
        } catch (e: any) {
          server.config.logger.error(`[api/${name}] ${e?.stack || e}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: { message: 'Errore del server locale: guarda il Terminale' } }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Variabili di .env / .env.local disponibili alle funzioni /api (senza prefisso VITE_ non arrivano mai al browser)
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
  if (mode === 'development' && process.env.LOCAL_FS === undefined) process.env.LOCAL_FS = '1';

  return {
    plugins: [react(), tailwindcss(), localApi()],
    build: { sourcemap: false },
  };
});
