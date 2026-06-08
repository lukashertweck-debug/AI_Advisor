// Shared domain types for the advisor. Kept framework-agnostic so the same
// shapes are used by the UI, the API routes, and (later) the Telegram bot.

export type TxType = "income" | "expense";

export type Category =
  | "Income"
  | "Housing"
  | "Groceries"
  | "Dining"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Health"
  | "Travel"
  | "Subscriptions"
  | "Savings"
  | "Other";

export const CATEGORIES: Category[] = [
  "Income",
  "Housing",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Travel",
  "Subscriptions",
  "Savings",
  "Other",
];

export interface Transaction {
  id: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  description: string;
  /** Always a positive number; `type` decides the direction. */
  amount: number;
  type: TxType;
  category: Category;
  /** Where it came from — useful once bank sync is added. */
  source?: "manual" | "import" | "bank";
}

export interface Budget {
  category: Category;
  /** Monthly limit in the account currency. */
  limit: number;
}

export interface StoreData {
  currency: string;
  transactions: Transaction[];
  budgets: Budget[];
}

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}
