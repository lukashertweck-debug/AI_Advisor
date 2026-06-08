# Fin — AI Financial Advisor 💸

A personal finance **dashboard** with a built-in **AI advisor** ("Fin") that
reasons about your actual numbers, and an architecture ready to **text you on
Telegram** like a real person after a big purchase — or whenever you ask it for
spending advice.

Built with **Next.js (App Router) + TypeScript + Tailwind**.

---

## What works today

- 📊 **Dashboard** — balance, 30-day income/spending, savings rate, spend-by-category
  donut, 6-month income-vs-spending trend.
- 🎯 **Budgets** — per-category monthly limits with progress + over-budget warnings.
- ✍️ **Manual entry** — add/delete transactions; data persists to a local JSON store.
- 🤖 **Advisor chat** — ask "can I afford a €400 phone?", "where can I cut back?",
  "how are my budgets?". Works **out of the box** with smart rule-based advice.
- 💬 **Proactive reactions** — log an expensive purchase and Fin "texts" you a
  reaction (shown in the UI now; routed to Telegram once configured).

## Designed for what's next

Every "later" feature is a drop-in, not a rewrite:

| Feature | How to turn it on |
| --- | --- |
| **Full conversational AI** (Claude) | Set `ANTHROPIC_API_KEY`. The advisor automatically switches from rule-based to Claude — same persona, same financial context. |
| **Telegram bot** | Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, then register the webhook (below). Proactive purchase nudges get sent to you, and you can ask the bot for advice from your phone. |
| **Automated bank data** | All data flows through `lib/db.ts`. Swap its JSON store for Postgres/SQLite or a Plaid-style sync without touching the UI or API routes. |

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — app runs without any keys
npm run dev                  # http://localhost:3000
```

The app ships with a few months of **sample data** so the dashboard is alive on
first load. Add your own transactions to make it yours.

## Enabling the AI (optional)

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6   # optional override
```

Restart the dev server — the chat header will show **"Claude AI connected"**.

## Enabling Telegram (optional)

1. Create a bot with [@BotFather](https://t.me/BotFather) → copy the token.
2. Message [@userinfobot](https://t.me/userinfobot) to get your numeric chat id.
3. Fill in `.env.local`:
   ```bash
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=123456789
   TELEGRAM_WEBHOOK_SECRET=some-random-string
   BIG_PURCHASE_THRESHOLD=200   # purchases ≥ this trigger a proactive text
   ```
4. After deploying, register the webhook so the bot can answer you:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```

Now: expensive purchases ping you automatically, and texting the bot
"can I afford a €500 bike?" gets an answer grounded in your finances.

---

## Project layout

```
app/
  page.tsx                     # dashboard entry
  api/
    transactions/route.ts      # list/add (+ fires proactive reaction)
    transactions/[id]/route.ts # delete
    budgets/route.ts           # read/update budgets
    advisor/route.ts           # ask the advisor (AI or rule-based)
    telegram/webhook/route.ts  # Telegram bot endpoint
components/                    # dashboard UI + advisor chat + charts
lib/
  types.ts                     # shared domain types
  db.ts                        # storage interface (swap-in point for a real DB)
  finance.ts                   # pure money calculations
  advisor.ts                   # the "Fin" brain (Claude + rule-based fallback)
  telegram.ts                  # Telegram sender
  seed.ts                      # sample data
```

## Deploy

Push to GitHub and import into **Vercel** (already connected to this repo).
Add the optional env vars in the Vercel dashboard. Note: the local JSON store is
ephemeral on serverless hosts — wire `lib/db.ts` to a database for durable,
multi-device data (this is the intended next step toward automated bank sync).
