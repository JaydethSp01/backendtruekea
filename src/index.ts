// src/index.ts
import "reflect-metadata";
import http from "http";
import { createConnection, getConnection } from "typeorm";
import config from "./infrastructure/config/default";
import server from "./infrastructure/web/server";
import CarbonFootprintHelper from "./infrastructure/web/utils/CarbonFootprintHelper";

let httpServer: http.Server | null = null;

async function bootstrap() {
  try {
    await createConnection({
      type: "postgres",
      host: config.db.host,
      port: config.db.port,
      username: config.db.username,
      password: config.db.password,
      database: config.db.database,
      synchronize: config.db.synchronize,
      entities: config.db.entities,
      migrations: config.db.migrations,
    });
    console.log("🔌 Conexión a PostgreSQL establecida");

    console.log("♻️  Cargando datos de CO₂...");
    await CarbonFootprintHelper.loadDataFromDB();
    console.log("✅ Datos de CO₂ cargados exitosamente");

    httpServer = server.listen(config.app.port, "0.0.0.0", () => {
      console.log(
        `🚀 Servidor corriendo en el puerto ${config.app.port} y escuchando en 0.0.0.0`
      );
    });
  } catch (error) {
    console.error("❌ Error al inicializar la aplicación:", error);
    process.exit(1);
  }
}

function shutdown(signal: string): void {
  console.log(`[shutdown] Señal ${signal}: cerrando servidor HTTP...`);
  if (!httpServer) {
    process.exit(0);
    return;
  }
  httpServer.close(async () => {
    try {
      const conn = getConnection();
      await conn.close();
      console.log("[shutdown] Conexión TypeORM cerrada");
    } catch (e) {
      console.error("[shutdown] Error cerrando base de datos:", e);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[shutdown] Timeout: salida forzada");
    process.exit(1);
  }, 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

bootstrap();
