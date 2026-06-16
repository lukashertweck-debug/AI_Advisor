import { pool, query } from "./pg";
import { seedData } from "./seed";
import type { Budget, StoreData, Transaction } from "./types";

/**
 * Postgres-backed store. Every method is scoped to a `userId` so each account
 * only ever sees its own data — the dashboard, API routes, and Telegram bot all
 * go through here. Swapping storage engines later means only touching this file.
 */

const DEFAULT_CURRENCY = "EUR";

type UserId = string | number;

interface TxRow {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: string;
  category: string;
  source: string;
}

interface BudgetRow {
  category: string;
  limit: string;
}

function rowToTx(r: TxRow): Transaction {
  return {
    id: r.id,
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
    type: r.type as Transaction["type"],
    category: r.category as Transaction["category"],
    source: r.source as Transaction["source"],
  };
}

function rowToBudget(r: BudgetRow): Budget {
  return { category: r.category as Budget["category"], limit: Number(r.limit) };
}

function newId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const db = {
  // ---- finance data (per user) ----

  async getAll(userId: UserId): Promise<StoreData> {
    const [transactions, budgets] = await Promise.all([
      this.getTransactions(userId),
      this.getBudgets(userId),
    ]);
    return { currency: DEFAULT_CURRENCY, transactions, budgets };
  },

  async getTransactions(userId: UserId): Promise<Transaction[]> {
    const { rows } = await query<TxRow>(
      `SELECT id, date, description, amount, type, category, source
         FROM transactions
        WHERE user_id = $1
        ORDER BY date DESC, created_at DESC`,
      [userId]
    );
    return rows.map(rowToTx);
  },

  async addTransaction(
    userId: UserId,
    input: Omit<Transaction, "id" | "source"> & Partial<Pick<Transaction, "source">>
  ): Promise<Transaction> {
    const tx: Transaction = { id: newId(), source: "manual", ...input };
    await query(
      `INSERT INTO transactions (id, user_id, date, description, amount, type, category, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tx.id, userId, tx.date, tx.description, tx.amount, tx.type, tx.category, tx.source]
    );
    return tx;
  },

  async deleteTransaction(userId: UserId, id: string): Promise<boolean> {
    const res = await query(`DELETE FROM transactions WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  },

  async getBudgets(userId: UserId): Promise<Budget[]> {
    const { rows } = await query<BudgetRow>(
      `SELECT category, "limit" FROM budgets WHERE user_id = $1 ORDER BY category`,
      [userId]
    );
    return rows.map(rowToBudget);
  },

  async setBudgets(userId: UserId, budgets: Budget[]): Promise<Budget[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM budgets WHERE user_id = $1`, [userId]);
      for (const b of budgets) {
        await client.query(
          `INSERT INTO budgets (user_id, category, "limit") VALUES ($1, $2, $3)`,
          [userId, b.category, b.limit]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return budgets;
  },

  async getCurrency(_userId: UserId): Promise<string> {
    return DEFAULT_CURRENCY;
  },

  /** Give a brand-new account some starter data so the dashboard isn't empty. */
  async seedForUser(userId: UserId): Promise<void> {
    // Atomically claim the seed so concurrent sign-ins don't double-seed.
    const claim = await query(
      `UPDATE users SET seeded = TRUE WHERE id = $1 AND seeded = FALSE RETURNING id`,
      [userId]
    );
    if ((claim.rowCount ?? 0) === 0) return;

    const data = seedData();
    for (const b of data.budgets) {
      await query(
        `INSERT INTO budgets (user_id, category, "limit") VALUES ($1, $2, $3)
         ON CONFLICT (user_id, category) DO NOTHING`,
        [userId, b.category, b.limit]
      );
    }
    for (const t of data.transactions) {
      await query(
        `INSERT INTO transactions (id, user_id, date, description, amount, type, category, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId(), userId, t.date, t.description, t.amount, t.type, t.category, "manual"]
      );
    }
  },

  // ---- user lookups (used by auth + telegram) ----

  async getUserForLogin(
    email: string
  ): Promise<{ id: number; email: string; name: string | null; password: string | null } | null> {
    const { rows } = await query<{ id: number; email: string; name: string | null; password: string | null }>(
      `SELECT id, email, name, password FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  },

  async createCredentialsUser(
    email: string,
    passwordHash: string,
    name: string | null
  ): Promise<{ id: number } | null> {
    try {
      const { rows } = await query<{ id: number }>(
        `INSERT INTO users (email, password, name) VALUES (lower($1), $2, $3) RETURNING id`,
        [email, passwordHash, name]
      );
      return rows[0] ?? null;
    } catch (err: unknown) {
      // Unique violation -> email already registered.
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
        return null;
      }
      throw err;
    }
  },

  async getUserIdByEmail(email: string): Promise<number | null> {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    return rows[0]?.id ?? null;
  },
};
