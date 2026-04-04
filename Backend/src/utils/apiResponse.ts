import { Response } from "express";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  error: string,
  message: string = "An error occurred",
  statusCode: number = 500
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    message,
  };
  return res.status(statusCode).json(response);
}
