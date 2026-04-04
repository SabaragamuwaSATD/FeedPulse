import { Request, Response, NextFunction } from "express";

/**
 * Basic input sanitiser — strips HTML tags and trims strings
 * to prevent XSS and reject obviously bad input.
 */
export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      // Strip HTML tags
      obj[key] = obj[key].replace(/<[^>]*>/g, "");
      // Trim whitespace
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
