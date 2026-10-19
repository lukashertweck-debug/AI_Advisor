"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { CATEGORIES, type Category, type Transaction, type TxType } from "@/lib/types";
import { formatMoney } from "@/lib/finance";
import { DonutChart, TrendChart } from "./charts";
import { AdvisorChat } from "./AdvisorChat";

interface DashboardPayload {
  currency: string;
  transactions: Transaction[];
  summary: {
    balance: number;
    income30: number;
    expense30: number;
    net30: number;
    savingsRate: number;
    topCategory: { category: string; amount: number } | null;
  };
  budgets: { category: string; limit: number; spent: number; remaining: number; ratio: number }[];
  categories: { category: string; amount: number }[];
  trend: { month: string; income: number; expense: number; net: number }[];
}

export function Dashboard({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [reaction, setReaction] = useState<{ message: string; usedAI: boolean } | null>(null);

  async function load() {
    const res = await fetch("/api/transactions", { cache: "no-store" });
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-400">Loading your finances…</div>
    );
  }

  const c = data.currency;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-brand-soft">Fin</span> — Financial Advisor
          </h1>
          <p className="text-sm text-slate-400">Your money, with an advisor that actually has your back.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/30 text-xs font-semibold uppercase">
              {(userName || userEmail || "?").slice(0, 1)}
            </span>
            <span className="max-w-[160px] truncate text-xs text-slate-300" title={userEmail}>
              {userName || userEmail}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </header>

      {reaction && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/30 text-lg">💬</div>
          <div className="text-sm">
            <p className="font-medium text-brand-soft">
              Fin texted you{reaction.usedAI ? "" : " (smart mode)"}
            </p>
            <p className="text-slate-200">{reaction.message}</p>
            <p className="mt-1 text-xs text-slate-400">
              Once Telegram is connected, this lands in your chat automatically.
            </p>
          </div>
          <button
            onClick={() => setReaction(null)}
            className="ml-auto text-slate-400 hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Balance" value={formatMoney(data.summary.balance, c)} accent="text-white" />
        <StatCard label="Income (30d)" value={formatMoney(data.summary.income30, c)} accent="text-emerald-400" />
        <StatCard label="Spending (30d)" value={formatMoney(data.summary.expense30, c)} accent="text-rose-400" />
        <StatCard
          label="Savings rate"
          value={`${Math.round(data.summary.savingsRate * 100)}%`}
          accent="text-brand-soft"
          sub={`Net ${formatMoney(data.summary.net30, c)}`}
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Left: charts + budgets + transactions */}
        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Where your money goes">
              <DonutChart data={data.categories} currency={c} />
            </Card>
            <Card title="Income vs spending">
              <TrendChart data={data.trend} currency={c} />
            </Card>
          </div>

          <Card title="Budgets this month">
            <Budgets budgets={data.budgets} currency={c} />
          </Card>

          <Card title="Add a transaction">
            <AddTransaction
              currency={c}
              onAdded={(r) => {
                if (r) setReaction(r);
                load();
              }}
            />
          </Card>

          <Card title="Recent transactions">
            <TransactionList
              transactions={data.transactions}
              currency={c}
              onDeleted={load}
            />
          </Card>

          <Card title="Lockscreen widget">
            <WidgetSetup />
          </Card>
        </div>

        {/* Right: advisor chat */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <Card title="" className="h-[640px]">
              <AdvisorChat />
            </Card>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-500">
        Demo data to start. Add transactions manually now — bank sync &amp; full AI plug in via env vars.
      </footer>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-ink-soft/70 p-4 sm:p-5 backdrop-blur ${className}`}>
      {title ? <h2 className="mb-3 text-sm font-semibold text-slate-300">{title}</h2> : null}
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-soft/70 p-4 backdrop-blur">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${accent}`}>{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Budgets({
  budgets,
  currency,
}: {
  budgets: DashboardPayload["budgets"];
  currency: string;
}) {
  if (!budgets.length) return <p className="text-sm text-slate-400">No budgets set.</p>;
  return (
    <ul className="space-y-3">
      {budgets.map((b) => {
        const pct = Math.min(100, Math.round(b.ratio * 100));
        const over = b.spent > b.limit;
        return (
          <li key={b.category}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-300">{b.category}</span>
              <span className={`tabular-nums ${over ? "text-rose-400" : "text-slate-400"}`}>
                {formatMoney(b.spent, currency)} / {formatMoney(b.limit, currency)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  over ? "bg-rose-500" : pct > 80 ? "bg-amber-400" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AddTransaction({
  currency,
  onAdded,
}: {
  currency: string;
  onAdded: (reaction: { message: string; usedAI: boolean } | null) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [category, setCategory] = useState<Category>("Shopping");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(",", "."));
    if (!description.trim() || !Number.isFinite(amt) || amt <= 0) {
      setError("Enter a description and a positive amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description, amount: amt, type, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add transaction.");
        return;
      }
      setDescription("");
      setAmount("");
      onAdded(data.reaction ?? null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. New laptop"
        className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm outline-none focus:border-brand sm:col-span-2"
      />
      <div className="flex rounded-xl border border-white/10 bg-black/30 focus-within:border-brand">
        <span className="grid place-items-center px-3 text-sm text-slate-400">{currencySymbol(currency)}</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          className="w-full bg-transparent py-2.5 pr-3 text-sm outline-none"
        />
      </div>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as TxType)}
        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-brand"
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-brand sm:col-span-1"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-soft disabled:opacity-50 sm:col-span-1"
      >
        {busy ? "Adding…" : "Add transaction"}
      </button>
      {error ? <p className="text-xs text-rose-400 sm:col-span-2">{error}</p> : null}
    </form>
  );
}

function TransactionList({
  transactions,
  currency,
  onDeleted,
}: {
  transactions: Transaction[];
  currency: string;
  onDeleted: () => void;
}) {
  const visible = useMemo(() => transactions.slice(0, 15), [transactions]);

  async function remove(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    onDeleted();
  }

  if (!visible.length) return <p className="text-sm text-slate-400">No transactions yet.</p>;

  return (
    <ul className="divide-y divide-white/5">
      {visible.map((t) => (
        <li key={t.id} className="group flex items-center gap-3 py-2.5">
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs ${
              t.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-slate-300"
            }`}
          >
            {t.type === "income" ? "+" : categoryEmoji(t.category)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-200">{t.description}</p>
            <p className="text-xs text-slate-500">
              {t.date} · {t.category}
            </p>
          </div>
          <span
            className={`tabular-nums text-sm ${
              t.type === "income" ? "text-emerald-400" : "text-slate-200"
            }`}
          >
            {t.type === "income" ? "+" : "−"}
            {formatMoney(t.amount, currency)}
          </span>
          <button
            onClick={() => remove(t.id)}
            className="ml-1 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
            aria-label="Delete"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function WidgetSetup() {
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/widget-token")
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? null))
      .catch(() => setToken(null));
  }, []);

  const endpoint = origin ? `${origin}/api/widget` : "/api/widget";

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function rotate() {
    if (!confirm("Generate a new token? Any widget using the old one will stop working until you update it.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/widget-token", { method: "POST" });
      const d = await res.json();
      setToken(d.token ?? null);
      setRevealed(true);
    } finally {
      setBusy(false);
    }
  }

  const maskedToken = token ? (revealed ? token : "•".repeat(Math.min(28, token.length))) : "…";

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-400">
        Show your balance &amp; savings rate on your iPhone lockscreen with the free{" "}
        <span className="text-slate-200">Scriptable</span> app. Paste the URL and token into the{" "}
        <code className="rounded bg-black/40 px-1 text-xs">scriptable/fin-widget.js</code> script
        from the repo.
      </p>

      <Field
        label="Endpoint URL"
        value={endpoint}
        display={endpoint}
        onCopy={() => copy(endpoint, "url")}
        copied={copied === "url"}
      />

      <Field
        label="Your secret token"
        value={token ?? ""}
        display={maskedToken}
        onCopy={() => token && copy(token, "token")}
        copied={copied === "token"}
        extra={
          <button
            onClick={() => setRevealed((v) => !v)}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        }
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-xs text-slate-500">
          Anyone with this token can read your summary numbers. Rotate it if it leaks.
        </p>
        <button
          onClick={rotate}
          disabled={busy}
          className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "…" : "New token"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  display,
  onCopy,
  copied,
  extra,
}: {
  label: string;
  value: string;
  display: string;
  onCopy: () => void;
  copied: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
          {display || value}
        </code>
        {extra}
        <button
          onClick={onCopy}
          className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-soft"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
  return map[currency] ?? currency;
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Housing: "🏠",
    Groceries: "🛒",
    Dining: "🍽",
    Transport: "🚆",
    Shopping: "🛍",
    Entertainment: "🎬",
    Health: "💊",
    Travel: "✈",
    Subscriptions: "🔁",
    Savings: "🐖",
    Other: "•",
  };
  return map[category] ?? "•";
}
