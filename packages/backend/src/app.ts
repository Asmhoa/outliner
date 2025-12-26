import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { pagesRouter } from './routes/pages.route';
import { blocksRouter } from './routes/blocks.route';
import { workspacesRouter } from './routes/workspaces.route';
import { databasesRouter } from './routes/databases.route';
import { searchRouter } from './routes/search.route';
import { errorHandler } from './middleware';
import { injectSystemDatabase } from './database/system.provider';
import { PORT } from './config';

const app: express.Application = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || '']
    : [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, `http://localhost:5173`],
  credentials: true
}));
app.use(express.json());

// System database dependency injection
// Not needed but can reduce code.
// Might be a bad idea if requests are saved anywhere?
// app.use(injectSystemDatabase);

// Routes
app.use(pagesRouter);
app.use(blocksRouter);
app.use(workspacesRouter);
app.use(databasesRouter);
app.use(searchRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export { app, PORT };
