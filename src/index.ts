// src/index.ts
import * as dotenv from "dotenv";
import * as path from "path";

// 1. Cargar variables de entorno inmediatamente
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

import "reflect-metadata";
import http from "http";
import { Connection, createConnection } from "typeorm";
import { createClient } from "@libsql/client";
import libsql from "@libsql/sqlite3";
import config from "./infrastructure/config/default";
import server from "./infrastructure/web/server";
import CarbonFootprintHelper from "./infrastructure/web/utils/CarbonFootprintHelper";

let httpServer: http.Server | null = null;
let appConnection: Connection | null = null;

async function bootstrap() {
  console.log("🚀 Iniciando Bootstrap (Modo DataSource Turso)...");
  
  try {
    const rawUrl = (config.db.database || "").trim();
    const token = (config.db.authToken || "").trim();

    console.log(`📡 Pre-flight check: Verificando conectividad con Turso...`);
    const client = createClient({ url: rawUrl, authToken: token });
    await client.execute("SELECT 1");
    console.log("✅ Conexión verificada con Turso (LibSQL)");

    // 2. Configuración de DataSource (TypeORM 0.3+)
    // Para @libsql/sqlite3 el token se inyecta en la URL como query param.
    const dbUrl = rawUrl.includes("?")
      ? `${rawUrl}&authToken=${encodeURIComponent(token)}`
      : `${rawUrl}?authToken=${encodeURIComponent(token)}`;

    appConnection = await createConnection({
      type: "sqlite",
      database: dbUrl,
      driver: libsql,
      flags: libsql.OPEN_READWRITE | libsql.OPEN_CREATE | libsql.OPEN_URI,
      synchronize: config.db.synchronize,
      entities: config.db.entities,
      migrations: config.db.migrations,
      logging: false
    });

    console.log("🔌 Inicializando DataSource...");
    console.log("✅ TypeORM conectado a Turso exitosamente");

    console.log("♻️  Cargando datos de CO₂...");
    await CarbonFootprintHelper.loadDataFromDB();
    console.log("✅ Datos de CO₂ cargados");

    const port = config.app.port;
    httpServer = server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${port}`);
    });

  } catch (error) {
    console.error("❌ ERROR CRÍTICO AL INICIAR:", error);
    process.exit(1);
  }
}

function shutdown(signal: string): void {
  console.log(`[shutdown] Señal ${signal}: cerrando...`);
  if (httpServer) {
    httpServer.close(async () => {
      if (appConnection && appConnection.isConnected) {
        try {
          await appConnection.close();
          console.log("[shutdown] Conexion DB cerrada");
        } catch (e) {
          console.error("[shutdown] Error al cerrar conexion DB:", e);
        }
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    console.error("[shutdown] Timeout: salida forzada");
    process.exit(1);
  }, 5000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

bootstrap();
