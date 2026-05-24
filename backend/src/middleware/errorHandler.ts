import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/HttpError";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, "Route not found"));
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  res.status(500).json({
    error: message,
  });
};
