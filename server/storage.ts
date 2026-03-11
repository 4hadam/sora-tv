import { type User, type InsertUser, users } from "@shared/schema";
import { randomUUID } from "crypto";

// Provide two storage implementations:
// - PostgresStorage (uses drizzle + pg) when DATABASE_URL is set
// - MemStorage fallback for development when DATABASE_URL is not provided

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

// ----------------- MemStorage (fallback) -----------------
export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

// ----------------- Postgres/Drizzle Storage -----------------
let PostgresStorageClass: any = null;
try {
  // lazy-require DB libraries so project still loads without DB deps at dev time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle } = require('drizzle-orm/node-postgres');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { eq } = require('drizzle-orm');

  class PostgresStorage implements IStorage {
    private pool: any;
    private db: any;

    constructor(connectionString: string) {
      this.pool = new Pool({ connectionString });
      this.db = drizzle(this.pool);
    }

    async getUser(id: string): Promise<User | undefined> {
      const rows = await this.db.select().from(users).where(eq(users.id, id));
      return rows[0] as User | undefined;
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
      const rows = await this.db.select().from(users).where(eq(users.username, username));
      return rows[0] as User | undefined;
    }

    async createUser(insertUser: InsertUser): Promise<User> {
      const result = await this.db.insert(users).values({ username: insertUser.username, password: insertUser.password }).returning();
      // returning() returns an array of inserted rows
      return result[0] as User;
    }

    // expose pool for graceful shutdown if needed
    getPool() {
      return this.pool;
    }
  }

  PostgresStorageClass = PostgresStorage;
} catch (err) {
  // If dependencies are not installed, we silently fallback to MemStorage
}

// Export the chosen storage implementation
let storageImpl: IStorage;
const conn = process.env.DATABASE_URL || process.env.PG_CONN_STRING || '';
if (conn && PostgresStorageClass) {
  storageImpl = new PostgresStorageClass(conn);
} else {
  storageImpl = new MemStorage();
}

export const storage: IStorage = storageImpl;
