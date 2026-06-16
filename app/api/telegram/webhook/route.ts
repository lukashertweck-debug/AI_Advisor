import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ask } from "@/lib/advisor";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Telegram webhook. Once you register this URL with BotFather/setWebhook, any
 * message you send the bot is answered by the same advisor brain the dashboard
 * uses — so you can ask "can I afford a €500 bike?" from your phone.
 *
 * Because data is now per-account, the bot is linked to one owner account via
 * TELEGRAM_OWNER_EMAIL (the email you registered/sign in with).
 *
 * The webhook is verified with the secret token Telegram echoes back in the
 * `X-Telegram-Bot-Api-Secret-Token` header.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true }); // ack malformed updates so Telegram stops retrying
  }

  const message = update?.message ?? update?.edited_message;
  const text: string | undefined = message?.text;
  const chatId: number | string | undefined = message?.chat?.id;

  if (!text || chatId === undefined) {
    return NextResponse.json({ ok: true });
  }

  // Resolve which account this bot speaks for.
  const ownerEmail = process.env.TELEGRAM_OWNER_EMAIL;
  const userId = ownerEmail ? await db.getUserIdByEmail(ownerEmail) : null;
  if (!userId) {
    await sendTelegramMessage(
      "This bot isn't linked to an account yet. Set TELEGRAM_OWNER_EMAIL to the email you use to sign in.",
      chatId
    );
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start")) {
    await sendTelegramMessage(
      "Hey! I'm Fin, your money advisor. Ask me things like \"can I afford a €400 phone?\", \"where can I cut back?\", or \"how are my budgets?\"",
      chatId
    );
    return NextResponse.json({ ok: true });
  }

  const data = await db.getAll(userId);
  const { reply } = await ask(text, data);
  await sendTelegramMessage(reply, chatId);
  return NextResponse.json({ ok: true });
}

// Lightweight health check for the webhook URL.
export async function GET() {
  return NextResponse.json({ status: "telegram webhook ready" });
}
