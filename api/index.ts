import type { VercelRequest, VercelResponse } from "@vercel/node";
import "reflect-metadata";
import { createConnection, getConnectionManager } from "typeorm";
import server from "../src/infrastructure/web/server";
import config from "../src/infrastructure/config/default";
import CarbonFootprintHelper from "../src/infrastructure/web/utils/CarbonFootprintHelper";

let initPromise: Promise<void> | null = null;

async function initApp(): Promise<void> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initPromise) {
    initPromise = initApp();
  }
  await initPromise;
  return server(req, res);
}
