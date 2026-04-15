import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { getConnection } from "typeorm";
import config from "../config/default";

import authRoutes from "../web/routes/authRoutes";
import itemRoutes from "../web/routes/itemRoutes";
import messageRoutes from "../web/routes/messageRoutes";
import ratingRoutes from "../web/routes/ratingRoutes";
import swapRoutes from "../web/routes/swapRoutes";
import userRoutes from "../web/routes/userRoutes";
import user_preferencesRoutes from "../web/routes/user_preferences";
import categoryRoutes from "../web/routes/category";
import roleRoutes from "../web/routes/roleRoutes";
import swapAdminRoutes from "../web/routes/swapAdminRoutes";

import { authMiddleware } from "../web/middlewares/authMiddleware";
import { errorMiddleware } from "../web/middlewares/errorMiddleware";
import { requestIdMiddleware } from "../web/middlewares/requestIdMiddleware";

const app = express();

if (config.app.trustProxy) {
  app.set("trust proxy", 1);
}

// Middlewares globales
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(requestIdMiddleware);
morgan.token("request-id", (req: Request) => (req as any).requestId ?? "-");
const prodLogFormat =
  ':request-id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
app.use(morgan(config.isProduction ? prodLogFormat : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/** Liveness: proceso arriba (sin comprobar BD). */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    env: config.isProduction ? "production" : "development",
  });
});

/** Readiness: conexión a PostgreSQL operativa. */
app.get("/health/ready", async (_req: Request, res: Response) => {
  try {
    await getConnection().query("SELECT 1");
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

// Rutas públicas
app.use("/auth", authRoutes);

// Rutas protegidas
app.use("/items", authMiddleware, itemRoutes);
app.use("/messages", authMiddleware, messageRoutes);
app.use("/ratings", authMiddleware, ratingRoutes);
app.use("/swaps", authMiddleware, swapRoutes);
app.use("/user/preferences", authMiddleware, user_preferencesRoutes);
app.use("/categories", authMiddleware, categoryRoutes);
app.use("/users", authMiddleware, userRoutes);
app.use("/roles", authMiddleware, roleRoutes);
app.use("/admin/swaps", authMiddleware, swapAdminRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Endpoint not found" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err, req, res, next);
});

export default app;
