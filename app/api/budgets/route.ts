import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { budgetStatus } from "@/lib/finance";
import type { Budget, Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const data = await db.getAll(userId);
  return NextResponse.json({ budgets: budgetStatus(data) });
}

// PUT /api/budgets -> replace the budget list.
export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body as { budgets?: unknown }).budgets;
  if (!Array.isArray(raw)) return NextResponse.json({ error: "budgets must be an array" }, { status: 400 });

  const budgets: Budget[] = [];
  for (const item of raw) {
    const b = item as Record<string, unknown>;
    const category = b.category as Category;
    const limit = typeof b.limit === "number" ? b.limit : Number(b.limit);
    if (!category || !Number.isFinite(limit) || limit < 0) {
      return NextResponse.json({ error: "each budget needs a category and non-negative limit" }, { status: 400 });
    }
    budgets.push({ category, limit: Math.round(limit * 100) / 100 });
  }

  await db.setBudgets(userId, budgets);
  const data = await db.getAll(userId);
  return NextResponse.json({ budgets: budgetStatus(data) });
}
