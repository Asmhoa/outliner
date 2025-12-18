import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pagesRouter } from './routes/pages.route';
import { blocksRouter } from './routes/blocks.route';
import { workspacesRouter } from './routes/workspaces.route';
import { databasesRouter } from './routes/databases.route';
import { utilsRouter } from './routes/utils.route';
import { errorHandler } from './middleware';
import { PORT } from './config';

const app: express.Application = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || '']
    : [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/pages', pagesRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/databases', databasesRouter);
app.use('/api/utils', utilsRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export { app, PORT };