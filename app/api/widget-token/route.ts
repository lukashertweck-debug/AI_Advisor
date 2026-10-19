import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET -> current widget token (created on first access).
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = await db.getOrCreateWidgetToken(userId);
  return NextResponse.json({ token });
}

// POST -> rotate the token (any existing widget stops working until updated).
export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = await db.regenerateWidgetToken(userId);
  return NextResponse.json({ token });
}
