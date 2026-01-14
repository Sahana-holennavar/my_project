import { Request, Response, NextFunction } from 'express';

// Basic error interface  
export interface AppError extends Error {
  statusCode?: number;
}

// Simple error handler - follows response format from ticket
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Response format matching the ticket requirements
  const response = {
    status: statusCode,
    message: message,
    success: false,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
