import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarize, budgetStatus, categorySpend, monthlyTrend } from "@/lib/finance";
import { reactToPurchase, bigThreshold } from "@/lib/advisor";
import { sendTelegramMessage, telegramEnabled } from "@/lib/telegram";
import type { Category, TxType } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/transactions -> everything the dashboard needs in one call.
export async function GET() {
  const data = await db.getAll();
  return NextResponse.json({
    currency: data.currency,
    transactions: await db.getTransactions(),
    summary: summarize(data),
    budgets: budgetStatus(data),
    categories: categorySpend(data.transactions.filter((t) => withinDays(t.date, 30))),
    trend: monthlyTrend(data.transactions, 6),
  });
}

// POST /api/transactions -> add one, and fire a proactive advisor reaction for
// notable purchases (the seed of the "texts you like a person" feature).
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseTx(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const tx = await db.addTransaction(parsed.value);
  const data = await db.getAll();

  // Decide whether this purchase deserves a nudge.
  let reaction: { message: string; usedAI: boolean } | null = null;
  let telegramSent = false;
  if (tx.type === "expense" && tx.amount >= bigThreshold()) {
    reaction = await reactToPurchase(tx, data);
    if (telegramEnabled()) {
      const r = await sendTelegramMessage(reaction.message);
      telegramSent = r.sent;
    }
  }

  return NextResponse.json({ transaction: tx, reaction, telegramSent }, { status: 201 });
}

function withinDays(date: string, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(date) >= cutoff;
}

const VALID_TYPES: TxType[] = ["income", "expense"];

function parseTx(
  body: unknown
):
  | { value: { date: string; description: string; amount: number; type: TxType; category: Category } }
  | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Body must be an object" };
  const b = body as Record<string, unknown>;

  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!description) return { error: "description is required" };

  const amount = typeof b.amount === "number" ? b.amount : Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "amount must be a positive number" };

  const type = b.type as TxType;
  if (!VALID_TYPES.includes(type)) return { error: "type must be 'income' or 'expense'" };

  const category = (typeof b.category === "string" ? b.category : "Other") as Category;
  const date =
    typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date)
      ? b.date
      : new Date().toISOString().slice(0, 10);

  return { value: { date, description, amount: Math.round(amount * 100) / 100, type, category } };
}
