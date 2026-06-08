import { promises as fs } from "fs";
import path from "path";
import type { Budget, StoreData, Transaction } from "./types";
import { seedData } from "./seed";

/**
 * Tiny persistence layer behind a clean async interface.
 *
 * Today it is backed by a JSON file (or memory when the filesystem is
 * read-only, e.g. on serverless hosts). Because every read/write goes through
 * this module, swapping in Postgres, SQLite, or a bank-sync source later only
 * touches this file — the UI and API routes stay the same.
 */

const DATA_FILE = path.join(process.cwd(), "data", "store.runtime.json");

// Process-wide cache so concurrent requests share one in-memory copy.
let cache: StoreData | null = null;
let writable = true;

async function load(): Promise<StoreData> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw) as StoreData;
  } catch {
    cache = seedData();
    await persist(); // best-effort; ignores read-only filesystems
  }
  return cache;
}

async function persist(): Promise<void> {
  if (!cache || !writable) return;
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // Read-only environment: keep working from memory for this process.
    writable = false;
  }
}

function newId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const db = {
  async getAll(): Promise<StoreData> {
    return load();
  },

  async getTransactions(): Promise<Transaction[]> {
    const data = await load();
    return [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  async addTransaction(
    input: Omit<Transaction, "id" | "source"> & Partial<Pick<Transaction, "source">>
  ): Promise<Transaction> {
    const data = await load();
    const tx: Transaction = { id: newId(), source: "manual", ...input };
    data.transactions.push(tx);
    await persist();
    return tx;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const data = await load();
    const before = data.transactions.length;
    data.transactions = data.transactions.filter((t) => t.id !== id);
    const changed = data.transactions.length !== before;
    if (changed) await persist();
    return changed;
  },

  async getBudgets(): Promise<Budget[]> {
    const data = await load();
    return data.budgets;
  },

  async setBudgets(budgets: Budget[]): Promise<Budget[]> {
    const data = await load();
    data.budgets = budgets;
    await persist();
    return budgets;
  },

  async getCurrency(): Promise<string> {
    return (await load()).currency;
  },
};
