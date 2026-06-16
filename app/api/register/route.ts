import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/register { email, password, name? } -> create a credentials account.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim() : null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  const created = await db.createCredentialsUser(email, hash, name);
  if (!created) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  // Give the new account some starter data.
  await db.seedForUser(created.id);

  return NextResponse.json({ ok: true }, { status: 201 });
}
