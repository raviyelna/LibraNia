import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error handling middleware
 * Catches errors from route handlers and formats consistent error responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with stack trace
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Determine status code
  // If response already has a status code set (not 200), use it
  // Otherwise default to 500 (Internal Server Error)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message,
    // Include stack trace only in development mode
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
