import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@libsql/client";
import BetterSqlite3 from "better-sqlite3";

// 1. Cargar entorno
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SQLITE_FILE = process.env.SQLITE_SOURCE_FILE || "truekea.sqlite";
const TURSO_URL = process.env.TURSO_DATABASE_URL || "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

if (!TURSO_URL || !TURSO_TOKEN) {
    console.error("❌ Error: TURSO_DATABASE_URL o TURSO_AUTH_TOKEN no definidos.");
    process.exit(1);
}

async function runMigration() {
    const sqlitePath = path.resolve(process.cwd(), SQLITE_FILE);
    console.log(`📂 Leyendo archivo local: ${sqlitePath}`);
    
    // Conexión local
    const localDb = new BetterSqlite3(sqlitePath, { fileMustExist: true });
    
    // Cliente Turso (Directo)
    const turso = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN,
    });

    console.log("🔌 Conectado a Turso (Direct Client). Empezando migración...");

    try {
        // Tablas a migrar en orden de dependencia
        const tables = [
            "roles",
            "categories",
            "users",
            "items",
            "swaps",
            "ratings",
            "messages",
            "user_preferences"
        ];

        for (const table of tables) {
            console.log(`📦 Migrando tabla: ${table}...`);
            const rows = localDb.prepare(`SELECT * FROM ${table}`).all() as any[];
            
            if (rows.length === 0) {
                console.log(`  - Tabla ${table} vacía, saltando.`);
                continue;
            }

            // Insertar filas una por una o en lotes (aquí por simplicidad una por una en transacción)
            for (const row of rows) {
                const keys = Object.keys(row);
                const values = Object.values(row);
                const placeholders = keys.map(() => "?").join(", ");
                
                await turso.execute({
                    sql: `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
                    args: values as any
                });
            }
            console.log(`  ✅ ${rows.length} filas migradas.`);
        }

        console.log("🎉 ¡Migración completada con éxito!");
    } catch (err) {
        console.error("⚠️ Error durante la migración:", err);
    } finally {
        localDb.close();
    }
}

runMigration().catch(console.error);
