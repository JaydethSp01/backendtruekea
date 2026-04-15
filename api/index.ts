import "reflect-metadata";
import { createConnection, getConnectionManager } from "typeorm";

let initPromise: Promise<void> | null = null;
let cachedServer: ((req: any, res: any) => any) | null = null;

async function initApp(): Promise<void> {
  const { default: config } = await import("../src/infrastructure/config/default");
  const { default: CarbonFootprintHelper } = await import(
    "../src/infrastructure/web/utils/CarbonFootprintHelper"
  );

  const connectionManager = getConnectionManager();
  if (connectionManager.has("default")) {
    const conn = connectionManager.get("default");
    if (!conn.isConnected) {
      await conn.connect();
    }
  } else {
    const dbUrl = config.db.database.includes("?")
      ? `${config.db.database}&authToken=${encodeURIComponent(config.db.authToken)}`
      : `${config.db.database}?authToken=${encodeURIComponent(config.db.authToken)}`;

    await createConnection({
      type: "sqlite",
      database: dbUrl,
      // @ts-ignore - driver sqlite compatible con libsql.
      driver: require("@libsql/sqlite3"),
      synchronize: config.db.synchronize,
      entities: config.db.entities,
      migrations: config.db.migrations,
      logging: false,
    });
  }

  await CarbonFootprintHelper.loadDataFromDB();
}

export default async function handler(req: any, res: any) {
  if (!initPromise) {
    initPromise = initApp();
  }
  try {
    await initPromise;
    if (!cachedServer) {
      const mod = await import("../src/infrastructure/web/server");
      cachedServer = mod.default;
    }
    return cachedServer(req, res);
  } catch (error: any) {
    // Permite observar el motivo real en logs de Vercel sin caer en crash opaco.
    console.error("[vercel] init error:", error);
    initPromise = null;
    return res.status(500).json({
      message: "Initialization failed",
      detail: error?.message || "unknown error",
    });
  }
}
