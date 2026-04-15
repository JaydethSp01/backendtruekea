import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function test() {
    console.log("== TEST: Iniciando prueba de conexión directa con @libsql/sqlite3 ==");
    try {
        const lib = require("@libsql/sqlite3");
        const url = process.env.TURSO_DATABASE_URL || "";
        const token = process.env.TURSO_AUTH_TOKEN || "";
        
        const dbUrl = url.includes("?") 
            ? `${url}&authToken=${token}` 
            : `${url}?authToken=${token}`;

        console.log(`Intentando abrir: ${url.split('?')[0]}`);
        
        const db = new lib.Database(dbUrl);
        
        console.log("Objeto Database creado. Intentando consulta...");
        
        db.get("SELECT 1 as val", (err: any, row: any) => {
            if (err) {
                console.error("❌ Error en consulta:", err);
            } else {
                console.log("✅ Consulta exitosa:", row);
            }
            db.close();
        });
    } catch (e) {
        console.error("💥 Error fatal en el test:", e);
    }
}

test().catch(console.error);
