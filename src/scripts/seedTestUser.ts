import "reflect-metadata";
import bcrypt from "bcrypt";
import { createConnection, getRepository } from "typeorm";
import config from "../infrastructure/config/default";
import { RoleEntity } from "../infrastructure/adapter/typeorm/entities/RoleEntity";
import { UserEntity } from "../infrastructure/adapter/typeorm/entities/UserEntity";
import { CategoryEntity } from "../infrastructure/adapter/typeorm/entities/CategoryEntity";

const TEST_EMAIL = process.env.SEED_TEST_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || "password123";
const TEST_NAME = process.env.SEED_TEST_NAME || "Usuario de Prueba";

async function seed() {
  const dbUrl = config.db.database.includes("?")
    ? `${config.db.database}&authToken=${config.db.authToken}`
    : `${config.db.database}?authToken=${config.db.authToken}`;

  const connection = await createConnection({
    type: "sqlite",
    database: dbUrl,
    // @ts-ignore
    driver: require("@libsql/sqlite3"),
    synchronize: config.db.synchronize,
    entities: config.db.entities,
    migrations: config.db.migrations,
  });

  try {
    const roleRepo = getRepository(RoleEntity);
    const categoryRepo = getRepository(CategoryEntity);
    const userRepo = getRepository(UserEntity);

    // Roles mínimos (idempotente). Forzamos IDs para coincidir con el frontend (1 admin, 2 user).
    await roleRepo.save([
      { id: 1, name: "admin" },
      { id: 2, name: "user" },
    ]);

    // Categorías mínimas (idempotente) para que la app no quede vacía.
    // Si ya existen por nombre (unique), no las tocamos.
    const baseCategories: Array<{ name: string; co2: number }> = [
      { name: "Hogar", co2: 2.5 },
      { name: "Electrónica", co2: 8.2 },
      { name: "Ropa", co2: 3.1 },
      { name: "Libros", co2: 1.2 },
    ];
    for (const c of baseCategories) {
      const existing = await categoryRepo.findOne({ where: { name: c.name } });
      if (!existing) await categoryRepo.save(c);
    }

    const existingUser = await userRepo.findOne({ where: { email: TEST_EMAIL } });
    if (existingUser) {
      console.log(`✅ Seed: usuario ya existe: ${TEST_EMAIL}`);
      return;
    }

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await userRepo.save({
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: passwordHash,
      roleId: { id: 2 },
      status_user: "active",
      phone: null,
      location: null,
      bio: null,
    });

    console.log(`✅ Seed: usuario creado: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  } finally {
    await connection.close();
  }
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});

