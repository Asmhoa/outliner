import { ErrorRequestHandler } from 'express';
import { 
  PageNotFoundError, 
  BlockNotFoundError, 
  WorkspaceNotFoundError, 
  UserDatabaseNotFoundError 
} from '../database/errors';

// Define custom error types for better type checking
interface CustomError extends Error {
  status?: number;
}

export const errorHandler: ErrorRequestHandler = (
  err: CustomError,
  _req,
  res,
  _next
) => {
  // Map custom errors to appropriate HTTP status codes
  if (err instanceof PageNotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  if (err instanceof BlockNotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  if (err instanceof WorkspaceNotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  if (err instanceof UserDatabaseNotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  // Handle validation errors or other errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Default to 500 for unhandled errors
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
};