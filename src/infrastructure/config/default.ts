import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function requireProd(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(
      `[config] Variable de entorno obligatoria en producción: ${name}`
    );
  }
  return v;
}

function resolveDbSynchronize(): boolean {
  const explicit = process.env.DB_SYNCHRONIZE?.toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  // Doce factores (Dev/Prod parity): en prod no auto-sincronizar esquema por defecto.
  return !isProduction;
}

/** JWT por defecto solo para desarrollo local; en producción debe venir de env. */
const DEV_JWT_PLACEHOLDER =
  "__dev_only_do_not_use_in_production_change_via_env__";

function jwtSecret(): string {
  if (isProduction) {
    return requireProd("JWT_SECRET", process.env.JWT_SECRET);
  }
  return process.env.JWT_SECRET || DEV_JWT_PLACEHOLDER;
}

function jwtRefreshSecret(): string {
  if (isProduction) {
    return requireProd("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET);
  }
  return process.env.JWT_REFRESH_SECRET || `${DEV_JWT_PLACEHOLDER}_refresh`;
}

function dbPassword(): string {
  if (isProduction) {
    return requireProd("DB_PASS", process.env.DB_PASS);
  }
  return process.env.DB_PASS || "password";
}

function resolveCorsOrigin(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") {
    return true;
  }
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0]! : list;
}

if (isProduction) {
  const weak = new Set([
    "your_jwt_secret",
    "your_refresh_secret",
    "secret",
    DEV_JWT_PLACEHOLDER,
    `${DEV_JWT_PLACEHOLDER}_refresh`,
  ]);
  const js = process.env.JWT_SECRET || "";
  const jr = process.env.JWT_REFRESH_SECRET || "";
  if (weak.has(js) || weak.has(jr)) {
    throw new Error(
      "[config] JWT_SECRET / JWT_REFRESH_SECRET no pueden usar valores de ejemplo en producción"
    );
  }
}

export default {
  isProduction,
  app: {
    port: Number(process.env.PORT) || 3000,
    /** Detrás de reverse proxy (nginx, load balancer): TRUST_PROXY=1 */
    trustProxy: process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true",
  },
  cors: {
    origin: resolveCorsOrigin(),
  },
  db: {
    type: "sqlite" as "sqlite",
    database: process.env.TURSO_DATABASE_URL || "truekea.db",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
    synchronize: resolveDbSynchronize(),
    entities: [__dirname + "/../adapter/typeorm/entities/*Entity.{ts,js}"],
    migrations: [__dirname + "/../adapter/typeorm/migrations/*.{ts,js}"],
  },
  jwt: {
    secret: jwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshSecret: jwtRefreshSecret(),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  azure: {
    connectionString:
      process.env.AZURE_CONNECTION_STRING || (isProduction ? "" : ""),
    containerName: process.env.AZURE_CONTAINER_NAME || "img-truekea1",
  },
};
