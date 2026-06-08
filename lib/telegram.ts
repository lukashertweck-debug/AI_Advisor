/**
 * Thin Telegram Bot API wrapper. It is intentionally side-effect-free unless
 * a bot token is configured, so the rest of the app can call
 * `sendTelegramMessage(...)` unconditionally and it simply no-ops until you add
 * credentials.
 *
 * Setup (later):
 *   1. Create a bot via @BotFather -> get TELEGRAM_BOT_TOKEN.
 *   2. Find your chat id (message @userinfobot) -> TELEGRAM_CHAT_ID.
 *   3. Point Telegram at the webhook so the bot can answer questions:
 *        https://api.telegram.org/bot<token>/setWebhook?url=<your-domain>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */

export function telegramEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegramMessage(
  text: string,
  chatId: string | number | undefined = process.env.TELEGRAM_CHAT_ID
): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { sent: false, reason: "TELEGRAM_BOT_TOKEN not set" };
  if (!chatId) return { sent: false, reason: "chat id not provided" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) return { sent: false, reason: `Telegram API ${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: String(err) };
  }
}
