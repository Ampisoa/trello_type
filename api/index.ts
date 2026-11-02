import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDatabase } from '../server/db';
import { getCorsOptions } from '../server/utils/security';
import { cardsRouter } from '../server/routes/cards';
import { stepsRouter } from '../server/routes/steps';
import { usersRouter } from '../server/routes/users';
import { visitorsRouter } from '../server/routes/visitors';
import { commentsRouter } from '../server/routes/comments';
import { attachmentsRouter } from '../server/routes/attachments';
import { authRouter } from '../server/routes/auth';
import { polesRouter } from '../server/routes/poles';
import { boardsRouter } from '../server/routes/boards';

const app = express();

// Middlewares
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Non-blocking database initialization for Serverless cold starts
app.use((_req: Request, _res: Response, next: NextFunction) => {
  initDatabase().catch((err) => {
    console.warn('[Vercel Serverless] DB init non-blocking notice:', err?.message || err);
  });
  next();
});

// Health check endpoint
const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'Node.js Express (Vercel Serverless) + SQLite',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);
app.get('/v1/health', healthHandler);
app.get('/health', healthHandler);

// API Router
const apiRouter = express.Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/cards', cardsRouter);
apiRouter.use('/steps', stepsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/visitors', visitorsRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/attachments', attachmentsRouter);
apiRouter.use('/poles', polesRouter);
apiRouter.use('/boards', boardsRouter);

// Mount router under all potential Vercel rewrite paths
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/v1', apiRouter);
app.use('/', apiRouter);

// Global Error Handler to guarantee clean JSON and prevent 500 FUNCTION_INVOCATION_FAILED
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Vercel Serverless Global Error]:', err);
  res.status(err.status || 500).json({
    detail: err.message || 'Erreur interne du serveur backend.',
    error: true,
  });
});

export default app;
