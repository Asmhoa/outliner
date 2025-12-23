import { ErrorRequestHandler } from 'express';

// Define custom error types for better type checking
interface CustomError extends Error {
  status?: number;
}

// Map error names to HTTP status codes
const errorStatusMap: { [key: string]: number } = {
  PageNotFoundError: 404,
  BlockNotFoundError: 404,
  WorkspaceNotFoundError: 404,
  UserDatabaseNotFoundError: 404,
  PageAlreadyExistsError: 409,
  UserDatabaseAlreadyExistsError: 409,
};

export const errorHandler: ErrorRequestHandler = (
  err: CustomError,
  _req,
  res,
  _next
) => {
  // Use mapped status codes for known errors
  const statusCode = errorStatusMap[err.name] || err.status || 500;

  // Log unexpected errors
  if (statusCode === 500) {
    console.error('Unhandled error:', err);
  }

  return res.status(statusCode).json({ error: err.message });
};
