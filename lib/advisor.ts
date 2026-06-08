import type { AdvisorMessage, StoreData, Transaction } from "./types";
import { budgetStatus, categorySpend, formatMoney, summarize } from "./finance";

/**
 * The advisor's "brain". Two modes:
 *
 *  1. With ANTHROPIC_API_KEY set -> it talks to the Claude API and answers in
 *     natural language, grounded in a snapshot of your finances.
 *  2. Without a key -> it falls back to deterministic, rule-based advice so the
 *     product is useful out of the box and during local development.
 *
 * Both modes share the same personality and the same financial context builder,
 * so turning on the API later is a pure upgrade — no behavioural surprises.
 */

const PERSONA = `You are "Fin", a warm, sharp personal financial advisor.
You talk like a real, friendly human texting a friend — concise, direct, a bit
of wit, never preachy. You give concrete, actionable money advice grounded in
the user's actual numbers. You help them decide whether a purchase is worth it,
where to cut back, and how to spend or save smarter. When you are unsure, you
say so. You never invent numbers that are not in the provided context. Keep
replies short unless asked for detail.`;

export interface FinanceContext {
  summary: ReturnType<typeof summarize>;
  topCategories: { category: string; amount: number }[];
  budgets: { category: string; spent: number; limit: number }[];
  recent: { date: string; description: string; amount: number; type: string }[];
}

export function buildContext(data: StoreData): FinanceContext {
  const summary = summarize(data);
  const top = categorySpend(data.transactions).slice(0, 6);
  const budgets = budgetStatus(data);
  const recent = [...data.transactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12);
  return {
    summary,
    topCategories: top.map((c) => ({ category: c.category, amount: round(c.amount) })),
    budgets: budgets.map((b) => ({ category: b.category, spent: round(b.spent), limit: b.limit })),
    recent: recent.map((t) => ({
      date: t.date,
      description: t.description,
      amount: round(t.amount),
      type: t.type,
    })),
  };
}

function contextAsText(ctx: FinanceContext): string {
  const c = ctx.summary.currency;
  const lines = [
    `Currency: ${c}`,
    `Balance (all time): ${formatMoney(ctx.summary.balance, c)}`,
    `Last 30 days — income: ${formatMoney(ctx.summary.income30, c)}, spending: ${formatMoney(
      ctx.summary.expense30,
      c
    )}, net: ${formatMoney(ctx.summary.net30, c)}, savings rate: ${(ctx.summary.savingsRate * 100).toFixed(0)}%`,
    `Top spending categories: ${ctx.topCategories
      .map((t) => `${t.category} ${formatMoney(t.amount, c)}`)
      .join(", ")}`,
    `Budgets this month: ${ctx.budgets
      .map((b) => `${b.category} ${formatMoney(b.spent, c)}/${formatMoney(b.limit, c)}`)
      .join(", ")}`,
    `Recent transactions: ${ctx.recent
      .map((t) => `${t.date} ${t.description} ${t.type === "income" ? "+" : "-"}${formatMoney(t.amount, c)}`)
      .join("; ")}`,
  ];
  return lines.join("\n");
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Ask the advisor a free-form question. Uses Claude when available. */
export async function ask(
  question: string,
  data: StoreData,
  history: AdvisorMessage[] = []
): Promise<{ reply: string; usedAI: boolean }> {
  const ctx = buildContext(data);
  if (aiEnabled()) {
    try {
      const reply = await askClaude(question, ctx, history);
      return { reply, usedAI: true };
    } catch (err) {
      // Fall through to rule-based answer if the API call fails.
      console.error("Claude call failed, falling back:", err);
    }
  }
  return { reply: ruleBasedAnswer(question, data), usedAI: false };
}

async function askClaude(
  question: string,
  ctx: FinanceContext,
  history: AdvisorMessage[]
): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user" as const,
      content: `Here is my current financial snapshot:\n\n${contextAsText(
        ctx
      )}\n\nMy question: ${question}`,
    },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: PERSONA,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  return json.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Rule-based fallback — genuinely useful, not a placeholder.
// ---------------------------------------------------------------------------

export function ruleBasedAnswer(question: string, data: StoreData): string {
  const q = question.toLowerCase();
  const ctx = buildContext(data);
  const c = ctx.summary.currency;

  // "Can I afford X?" / "Should I buy X for 300?"
  const priceMatch = question.match(/(\d+(?:[.,]\d+)?)/);
  const wantsPurchaseAdvice = /(buy|afford|spend|purchase|worth|should i)/.test(q);
  if (wantsPurchaseAdvice && priceMatch) {
    const price = Number(priceMatch[1].replace(",", "."));
    return purchaseVerdict(price, data);
  }

  if (/save|saving|savings/.test(q)) {
    const rate = (ctx.summary.savingsRate * 100).toFixed(0);
    const top = ctx.topCategories[0];
    return `You're saving about ${rate}% of your income over the last 30 days (net ${formatMoney(
      ctx.summary.net30,
      c
    )}). Your biggest spend is ${top ? `${top.category} at ${formatMoney(top.amount, c)}` : "fairly even across categories"}. Trimming 10–15% there is usually the easiest win. Want me to suggest a target budget?`;
  }

  if (/budget/.test(q)) {
    const over = budgetStatus(data).filter((b) => b.spent > b.limit);
    if (over.length === 0) return "You're within all your budgets this month — nice work. 👍";
    return `Heads up — you're over budget in: ${over
      .map((b) => `${b.category} (${formatMoney(b.spent, c)}/${formatMoney(b.limit, c)})`)
      .join(", ")}. Ease off those for the rest of the month.`;
  }

  if (/where|spend most|biggest|category/.test(q)) {
    return `Your top categories lately: ${ctx.topCategories
      .slice(0, 3)
      .map((t) => `${t.category} ${formatMoney(t.amount, c)}`)
      .join(", ")}.`;
  }

  // Generic fallback.
  return `Here's your snapshot: balance ${formatMoney(
    ctx.summary.balance,
    c
  )}, last 30 days you brought in ${formatMoney(ctx.summary.income30, c)} and spent ${formatMoney(
    ctx.summary.expense30,
    c
  )} (saving ${(ctx.summary.savingsRate * 100).toFixed(0)}%). Ask me things like "can I afford a €400 phone?", "where can I cut back?", or "how are my budgets?". (Set ANTHROPIC_API_KEY to unlock full conversational advice.)`;
}

function purchaseVerdict(price: number, data: StoreData): string {
  const ctx = buildContext(data);
  const c = ctx.summary.currency;
  const net = ctx.summary.net30;
  const balance = ctx.summary.balance;
  const pctOfNet = net > 0 ? (price / net) * 100 : Infinity;

  if (price > balance) {
    return `A ${formatMoney(price, c)} purchase is more than your current balance of ${formatMoney(
      balance,
      c
    )} — I'd hold off. If you really want it, save toward it over a couple of months first.`;
  }
  if (pctOfNet > 80) {
    return `${formatMoney(price, c)} would eat ~${pctOfNet.toFixed(
      0
    )}% of what you saved this month (${formatMoney(net, c)}). That's a big bite — sleep on it, and if it's not essential, wait until next month.`;
  }
  if (pctOfNet > 35) {
    return `You can technically afford ${formatMoney(price, c)} — it's about ${pctOfNet.toFixed(
      0
    )}% of this month's savings. Fine if it's something you'll use a lot; skip it if it's an impulse.`;
  }
  return `${formatMoney(price, c)} is comfortably within reach — roughly ${pctOfNet.toFixed(
    0
  )}% of this month's savings, and well under your balance. If you want it, go for it. 🙂`;
}

/**
 * Proactive reaction the advisor "texts" you after a notable purchase.
 * This is what gets pushed to Telegram once that's wired up; for now the UI
 * shows it so you can see the behaviour.
 */
export async function reactToPurchase(
  tx: Transaction,
  data: StoreData
): Promise<{ message: string; usedAI: boolean }> {
  if (aiEnabled()) {
    try {
      const ctx = buildContext(data);
      const prompt = `I just made this purchase: "${tx.description}" for ${formatMoney(
        tx.amount,
        data.currency
      )} in category ${tx.category}. Text me a short, friendly reaction (1-2 sentences) like a financial-advisor friend would — acknowledge it, and if it's notable relative to my budget/savings, gently flag it. Don't lecture.`;
      const message = await askClaude(prompt, ctx, []);
      return { message, usedAI: true };
    } catch (err) {
      console.error("reactToPurchase AI failed, falling back:", err);
    }
  }
  return { message: ruleReaction(tx, data), usedAI: false };
}

function ruleReaction(tx: Transaction, data: StoreData): string {
  const c = data.currency;
  const status = budgetStatus(data).find((b) => b.category === tx.category);
  const amount = formatMoney(tx.amount, c);
  if (status && status.spent > status.limit) {
    return `Just saw ${amount} on ${tx.description}. Heads up — that pushes your ${tx.category} budget over its ${formatMoney(
      status.limit,
      c
    )} limit for the month. Worth easing off there for a bit. 👀`;
  }
  if (tx.amount >= bigThreshold()) {
    return `Ooh, ${amount} on ${tx.description} — a chunky one! No alarm bells given your balance, just logging it. Hope it's a good buy. 😄`;
  }
  return `Logged ${amount} for ${tx.description}. All good — you're on track. 👍`;
}

export function bigThreshold(): number {
  const v = Number(process.env.BIG_PURCHASE_THRESHOLD);
  return Number.isFinite(v) && v > 0 ? v : 200;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
