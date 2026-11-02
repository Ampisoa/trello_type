import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db';
import { getCorsOptions } from './server/utils/security';
import { cardsRouter } from './server/routes/cards';
import { stepsRouter } from './server/routes/steps';
import { usersRouter } from './server/routes/users';
import { visitorsRouter } from './server/routes/visitors';
import { commentsRouter } from './server/routes/comments';
import { attachmentsRouter } from './server/routes/attachments';
import { authRouter } from './server/routes/auth';
import { polesRouter } from './server/routes/poles';
import { boardsRouter } from './server/routes/boards';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors(getCorsOptions()));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize SQLite database / schema
  await initDatabase();

  // Health check endpoint
  app.get(['/api/health', '/api/v1/health'], (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'Node.js Express + SQLite',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routers under /api/v1 and /api aliases
  const apiV1 = express.Router();
  apiV1.use('/auth', authRouter);
  apiV1.use('/cards', cardsRouter);
  apiV1.use('/steps', stepsRouter);
  apiV1.use('/users', usersRouter);
  apiV1.use('/poles', polesRouter);
  apiV1.use('/boards', boardsRouter);
  apiV1.use('/visitors', visitorsRouter);
  apiV1.use('/comments', commentsRouter);
  apiV1.use('/attachments', attachmentsRouter);

  app.use('/api/v1', apiV1);
  app.use('/api', apiV1);

  // Development: Vite middleware / Production: Static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Suivi de Flux backend Node.js + SQLite running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
