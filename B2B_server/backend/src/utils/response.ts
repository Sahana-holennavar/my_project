import { Response } from 'express';

export interface ApiResponse<T = any> {
  status: number;
  message: string;
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export class ResponseUtil {
  static created<T>(res: Response, message: string, data?: T): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = { status: 201, message, success: true, ...(data !== undefined && { data }) };
    return res.status(201).json(response);
  }

  static success<T>(res: Response, message: string, data?: T): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = { status: 200, message, success: true, ...(data !== undefined && { data }) };
    return res.status(200).json(response);
  }

  static validationError(res: Response, message: string, errors: ValidationError[]): Response<ApiResponse> {
    const response: ApiResponse = { status: 400, message, success: false, errors };
    return res.status(400).json(response);
  }

  static conflict(res: Response, message: string): Response<ApiResponse> {
    const response: ApiResponse = { status: 409, message, success: false };
    return res.status(409).json(response);
  }

  static forbidden(res: Response, message: string): Response<ApiResponse> {
    const response: ApiResponse = { status: 403, message, success: false };
    return res.status(403).json(response);
  }

  static serverError(res: Response, message: string): Response<ApiResponse> {
    const response: ApiResponse = { status: 500, message, success: false };
    return res.status(500).json(response);
  }

  static unauthorized(res: Response, message: string): Response<ApiResponse> {
    const response: ApiResponse = { status: 401, message, success: false };
    return res.status(401).json(response);
  }

  static notFound(res: Response, message: string): Response<ApiResponse> {
    const response: ApiResponse = { status: 404, message, success: false };
    return res.status(404).json(response);
  }

  static badRequest(res: Response, message: string): Response<ApiResponse> {
    const response: ApiResponse = { status: 400, message, success: false };
    return res.status(400).json(response);
  }

  // Generic sendSuccess method
  static sendSuccess<T>(res: Response, data: T, message: string, statusCode: number = 200): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = { status: statusCode, message, success: true, ...(data !== undefined && { data }) };
    return res.status(statusCode).json(response);
  }

  // Generic sendError method
  static sendError(res: Response, message: string, statusCode: number = 500): Response<ApiResponse> {
    const response: ApiResponse = { status: statusCode, message, success: false };
    return res.status(statusCode).json(response);
  }
}

export const SuccessMessages = { 
  USER_REGISTERED: 'User registered successfully',
  LOGIN_SUCCESSFUL: 'Login successful'
};

export const ErrorMessages = { 
  EMAIL_ALREADY_EXISTS: 'Email already exists', 
  VALIDATION_FAILED: 'Validation failed', 
  SERVER_ERROR: 'Internal server error',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials'
};

export default ResponseUtil;
