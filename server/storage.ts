import { type User, type InsertUser } from "@shared/schema";
import { randomUUID, scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ─────────────────────────────────────────────────────────────────────────────
// Secure password utilities (scrypt + salt, constant-time compare)
// ─────────────────────────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  const stored_buf = Buffer.from(hash, "hex");
  return derived.length === stored_buf.length && timingSafeEqual(derived, stored_buf);
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage interface
// ─────────────────────────────────────────────────────────────────────────────
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory storage (development / no DATABASE_URL)
// ─────────────────────────────────────────────────────────────────────────────
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashed = await hashPassword(insertUser.password);
    const user: User = { ...insertUser, password: hashed, id };
    this.users.set(id, user);
    return user;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL storage via Drizzle ORM (production — requires DATABASE_URL)
// ─────────────────────────────────────────────────────────────────────────────
export class DrizzleStorage implements IStorage {
  private db: any;

  constructor(connectionString: string) {
    // Lazy-import so the server still starts without pg installed
    import("pg").then(({ default: pg }) => {
      const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
      import("drizzle-orm/node-postgres").then(({ drizzle }) => {
        this.db = drizzle(pool);
      });
    }).catch((err) => {
      console.error("[storage] Failed to initialise Drizzle:", err.message);
    });
  }

  private async ready(): Promise<any> {
    if (this.db) return this.db;
    // Wait up to 5 seconds for the DB client to initialise
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (this.db) return this.db;
    }
    throw new Error("Database connection not ready");
  }

  async getUser(id: string): Promise<User | undefined> {
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const db = await this.ready();
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const db = await this.ready();
    const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return row;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { users } = await import("@shared/schema");
    const db = await this.ready();
    const hashed = await hashPassword(insertUser.password);
    const [row] = await db
      .insert(users)
      .values({ ...insertUser, password: hashed })
      .returning();
    return row;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export: use PostgreSQL in production, MemStorage in development
// ─────────────────────────────────────────────────────────────────────────────
export const storage: IStorage = process.env.DATABASE_URL
  ? new DrizzleStorage(process.env.DATABASE_URL)
  : new MemStorage();
