import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const headerId = req.headers["x-request-id"];
  const fromClient =
    typeof headerId === "string" && headerId.trim().length > 0
      ? headerId.trim()
      : Array.isArray(headerId) && headerId[0]?.trim()
        ? headerId[0].trim()
        : null;
  const id = fromClient || randomUUID();
  (req as any).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
