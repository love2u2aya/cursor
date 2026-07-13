import { promises as fs } from "fs";
import path from "path";
import type { Database } from "@/types/fp";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const defaultDb: Database = {
  fpUsers: [
    {
      id: "fp_demo",
      email: "fp@demo.local",
      name: "山田 太郎",
      password: "demo1234",
    },
  ],
  customers: [],
  sessions: [],
};

async function ensureDb(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf-8");
  }
}

export async function getDb(): Promise<Database> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

export async function saveDb(db: Database): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}
