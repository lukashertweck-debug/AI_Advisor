import type { Budget, Category, StoreData, Transaction } from "./types";

// Pure functions that turn raw transactions into the numbers the dashboard and
// the advisor reason about. No I/O here so they are trivial to test and reuse.

export interface CategorySpend {
  category: Category;
  amount: number;
}

export interface BudgetStatus {
  category: Category;
  limit: number;
  spent: number;
  remaining: number;
  /** 0..1+, where >1 means over budget. */
  ratio: number;
}

export interface MonthPoint {
  /** YYYY-MM */
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface Summary {
  balance: number;
  income30: number;
  expense30: number;
  net30: number;
  savingsRate: number; // 0..1
  topCategory: CategorySpend | null;
  currency: string;
}

function isExpense(t: Transaction): boolean {
  return t.type === "expense";
}

function withinDays(t: Transaction, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(t.date) >= cutoff;
}

export function summarize(data: StoreData): Summary {
  const recent = data.transactions.filter((t) => withinDays(t, 30));
  const income30 = recent.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense30 = recent.filter(isExpense).reduce((s, t) => s + t.amount, 0);

  const balance = data.transactions.reduce(
    (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
    0
  );

  const cats = categorySpend(data.transactions.filter((t) => withinDays(t, 30)));
  const topCategory = cats.length ? cats[0] : null;

  const net30 = income30 - expense30;
  const savingsRate = income30 > 0 ? Math.max(0, net30 / income30) : 0;

  return {
    balance,
    income30,
    expense30,
    net30,
    savingsRate,
    topCategory,
    currency: data.currency,
  };
}

export function categorySpend(transactions: Transaction[]): CategorySpend[] {
  const map = new Map<Category, number>();
  for (const t of transactions) {
    if (!isExpense(t)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function budgetStatus(data: StoreData): BudgetStatus[] {
  const spendThisMonth = categorySpend(thisMonth(data.transactions));
  const spentByCat = new Map(spendThisMonth.map((c) => [c.category, c.amount]));
  return data.budgets.map((b: Budget) => {
    const spent = spentByCat.get(b.category) ?? 0;
    const remaining = b.limit - spent;
    return {
      category: b.category,
      limit: b.limit,
      spent,
      remaining,
      ratio: b.limit > 0 ? spent / b.limit : 0,
    };
  });
}

export function monthlyTrend(transactions: Transaction[], months = 6): MonthPoint[] {
  const buckets = new Map<string, MonthPoint>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, { month: key, income: 0, expense: 0, net: 0 });
  }
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    const point = buckets.get(key);
    if (!point) continue;
    if (t.type === "income") point.income += t.amount;
    else point.expense += t.amount;
    point.net = point.income - point.expense;
  }
  return Array.from(buckets.values());
}

function thisMonth(transactions: Transaction[]): Transaction[] {
  const key = monthKey(new Date());
  return transactions.filter((t) => t.date.slice(0, 7) === key);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(amount: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
