import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarize } from "@/lib/finance";

export const dynamic = "force-dynamic";

/**
 * Public, token-authenticated summary for the lockscreen widget (Scriptable).
 *
 * No session cookie here — a widget can't do OAuth — so each account has a
 * secret token. Prefer the `Authorization: Bearer <token>` header (keeps the
 * token out of URLs/logs); `?token=` is accepted as a fallback.
 *
 * Returns only aggregate numbers, never individual transactions.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const token = bearer || new URL(req.url).searchParams.get("token") || "";

  const userId = await db.getUserIdByWidgetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await db.getAll(userId);
  const s = summarize(data);

  return NextResponse.json(
    {
      currency: s.currency,
      balance: round(s.balance),
      income30: round(s.income30),
      expense30: round(s.expense30),
      net30: round(s.net30),
      savingsRate: Math.round(s.savingsRate * 100),
      topCategory: s.topCategory
        ? { category: s.topCategory.category, amount: round(s.topCategory.amount) }
        : null,
      updated: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
