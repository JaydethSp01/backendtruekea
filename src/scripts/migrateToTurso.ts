import * as dotenv from "dotenv";
import * as path from "path";
// Forzamos la carga del .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import "reflect-metadata";
import { createConnection, getRepository } from "typeorm";
import BetterSqlite3 from "better-sqlite3";
import config from "../infrastructure/config/default";
import { UserEntity } from "../infrastructure/adapter/typeorm/entities/UserEntity";
import { RoleEntity } from "../infrastructure/adapter/typeorm/entities/RoleEntity";
import { CategoryEntity } from "../infrastructure/adapter/typeorm/entities/CategoryEntity";
import { ItemEntity } from "../infrastructure/adapter/typeorm/entities/ItemEntity";
import { SwapEntity } from "../infrastructure/adapter/typeorm/entities/SwapEntity";
import { RatingEntity } from "../infrastructure/adapter/typeorm/entities/RatingEntity";
import { MessageEntity } from "../infrastructure/adapter/typeorm/entities/MessageEntity";
import { UserPreferenceEntity } from "../infrastructure/adapter/typeorm/entities/UserPreferenceEntity";

// Configuración de la fuente (SQLite local)
const SQLITE_FILE = process.env.SQLITE_SOURCE_FILE || "truekea.sqlite";
const sqliteFilePath = path.isAbsolute(SQLITE_FILE) 
    ? SQLITE_FILE 
    : path.join(process.cwd(), SQLITE_FILE);

async function migrate() {
    console.log(`📂 Iniciando migración completa desde: ${sqliteFilePath}`);
    
    // 1. Abrir conexión con SQLite local
    let localDb: BetterSqlite3.Database;
    try {
        localDb = new BetterSqlite3(sqliteFilePath, { fileMustExist: true });
    } catch (error) {
        console.error("❌ No se encontró el archivo SQLite local.");
        process.exit(1);
    }

    // 2. Conectar a Turso
    const tursoUrl = process.env.TURSO_DATABASE_URL || "";
    const tursoToken = process.env.TURSO_AUTH_TOKEN || "";
    
    if (!tursoUrl) {
        console.error("❌ Error: TURSO_DATABASE_URL no definida en .env");
        process.exit(1);
    }

    const dbUrl = tursoUrl.includes("?") 
        ? `${tursoUrl}&authToken=${tursoToken}` 
        : `${tursoUrl}?authToken=${tursoToken}`;
    
    console.log(`🔌 Conectando a Turso: ${tursoUrl.split('?')[0]}`);
    console.log(`🔑 Auth Token presente: ${tursoToken ? "SÍ" : "NO"}`);

    const tursoConnection = await createConnection({
        type: "sqlite",
        database: dbUrl,
        // @ts-ignore
        driver: require("@libsql/sqlite3"),
        synchronize: true,
        entities: [path.resolve(__dirname, "../infrastructure/adapter/typeorm/entities/*Entity.{ts,js}")],
    });

    try {
        console.log("🔌 Conectado a Turso. Empezando transferencia de todas las tablas...");

        // 1. Migrar ROLES
        const localRoles = localDb.prepare("SELECT * FROM roles").all() as any[];
        console.log(`🎭 Migrando ${localRoles.length} roles...`);
        const roleRepo = getRepository(RoleEntity);
        for (const r of localRoles) {
            await roleRepo.save({ id: r.id, name: r.name });
        }

        // 2. Migrar CATEGORÍAS
        const localCategories = localDb.prepare("SELECT * FROM categories").all() as any[];
        console.log(`📦 Migrando ${localCategories.length} categorías...`);
        const catRepo = getRepository(CategoryEntity);
        for (const c of localCategories) {
            await catRepo.save({ id: c.id, name: c.name, co2: c.co2 });
        }

        // 3. Migrar USUARIOS
        const localUsers = localDb.prepare("SELECT * FROM users").all() as any[];
        console.log(`👤 Migrando ${localUsers.length} usuarios...`);
        const userRepo = getRepository(UserEntity);
        for (const u of localUsers) {
            await userRepo.save({
                id: u.id,
                name: u.name,
                email: u.email,
                password: u.password,
                roleId: u.roleId ? { id: u.roleId } : undefined,
                status_user: u.status_user,
                phone: u.phone,
                location: u.location,
                bio: u.bio,
                createdAt: new Date(u.createdAt),
                updatedAt: new Date(u.updatedAt)
            });
        }

        // 4. Migrar ITEMS
        const localItems = localDb.prepare("SELECT * FROM items").all() as any[];
        console.log(`🎸 Migrando ${localItems.length} items...`);
        const itemRepo = getRepository(ItemEntity);
        for (const i of localItems) {
            await itemRepo.save({
                id: i.id,
                title: i.title,
                description: i.description,
                value: i.value,
                img_item: i.img_item,
                category: i.categoryId ? { id: i.categoryId } : undefined,
                owner: i.ownerId ? { id: i.ownerId } : undefined,
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt)
            });
        }

        // 5. Migrar SWAPS
        const localSwaps = localDb.prepare("SELECT * FROM swaps").all() as any[];
        console.log(`🔄 Migrando ${localSwaps.length} swaps...`);
        const swapRepo = getRepository(SwapEntity);
        for (const s of localSwaps) {
            await swapRepo.save({
                id: s.id,
                status: s.status,
                requester: s.requesterId ? { id: s.requesterId } : undefined,
                respondent: s.respondentId ? { id: s.respondentId } : undefined,
                requestedItem: s.requestedItemId ? { id: s.requestedItemId } : undefined,
                offeredItem: s.offeredItemId ? { id: s.offeredItemId } : undefined,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt)
            });
        }

        // 6. Migrar RATINGS
        const localRatings = localDb.prepare("SELECT * FROM ratings").all() as any[];
        console.log(`⭐️ Migrando ${localRatings.length} ratings...`);
        const ratingRepo = getRepository(RatingEntity);
        for (const r of localRatings) {
            await ratingRepo.save({
                id: r.id,
                score: r.score,
                comment: r.comment,
                swap: r.swapId ? { id: r.swapId } : undefined,
                rater: r.raterId ? { id: r.raterId } : undefined,
                createdAt: new Date(r.createdAt)
            });
        }

        // 7. Migrar MENSAJES
        const localMessages = localDb.prepare("SELECT * FROM messages").all() as any[];
        console.log(`💬 Migrando ${localMessages.length} mensajes...`);
        const msgRepo = getRepository(MessageEntity);
        for (const m of localMessages) {
            await msgRepo.save({
                id: m.id,
                content: m.content,
                sender: m.senderId ? { id: m.senderId } : undefined,
                receiver: m.receiverId ? { id: m.receiverId } : undefined,
                item: m.itemId ? { id: m.itemId } : undefined,
                createdAt: new Date(m.createdAt)
            });
        }

        // 8. Migrar PREFERENCIAS
        const localPrefs = localDb.prepare("SELECT * FROM user_preferences").all() as any[];
        console.log(`⚙️ Migrando ${localPrefs.length} preferencias de usuario...`);
        const prefRepo = getRepository(UserPreferenceEntity);
        for (const p of localPrefs) {
            await prefRepo.save({
                id: p.id,
                user: p.userId ? { id: p.userId } : undefined,
                category: p.categoryId ? { id: p.categoryId } : undefined
            });
        }

        console.log("✅ Migración completa y exitosa hacia Turso.");
    } catch (err) {
        console.error("❌ Error durante la migración:", err);
    } finally {
        localDb.close();
        await tursoConnection.close();
    }
}

migrate().catch(err => {
    console.error("💥 Error crítico no capturado en el script de migración:");
    console.error(err);
    process.exit(1);
});
