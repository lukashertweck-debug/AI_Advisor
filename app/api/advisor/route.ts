import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { ask, aiEnabled } from "@/lib/advisor";
import type { AdvisorMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET -> capability probe so the UI can show whether full AI is on.
export async function GET() {
  return NextResponse.json({ aiEnabled: aiEnabled() });
}

// POST /api/advisor { question, history? } -> advice grounded in your finances.
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = typeof (body as { question?: unknown }).question === "string"
    ? ((body as { question: string }).question).trim()
    : "";
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

  const history = Array.isArray((body as { history?: unknown }).history)
    ? ((body as { history: AdvisorMessage[] }).history).slice(-10)
    : [];

  const data = await db.getAll(userId);
  const { reply, usedAI } = await ask(question, data, history);
  return NextResponse.json({ reply, usedAI });
}
