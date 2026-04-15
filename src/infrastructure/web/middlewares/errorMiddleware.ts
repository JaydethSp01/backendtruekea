import { Request, Response, NextFunction } from "express";
import config from "../../config/default";
import { HttpError } from "../errors/HttpError";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const rid = (req as any).requestId ?? "";

  if (err instanceof HttpError) {
    console.warn(`[${rid}] HttpError ${err.statusCode}: ${err.message}`);
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (config.isProduction) {
    console.error(`[${rid}] Unhandled error:`, err.message);
  } else {
    console.error(`[${rid}] Unhandled error:`, err);
  }

  res.status(500).json({ message: "Internal server error" });
}
