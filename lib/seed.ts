import type { StoreData, Transaction } from "./types";

// A few months of realistic-looking sample data so the dashboard is alive on
// first run. Dates are generated relative to "today" so the charts always show
// recent activity. Replace by adding your own transactions, importing a CSV,
// or (later) connecting a bank.

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

let counter = 0;
function tx(
  partial: Omit<Transaction, "id" | "source"> & Partial<Pick<Transaction, "source">>
): Transaction {
  counter += 1;
  return { id: `seed-${counter}`, source: "manual", ...partial };
}

export function seedData(): StoreData {
  return {
    currency: "EUR",
    budgets: [
      { category: "Groceries", limit: 450 },
      { category: "Dining", limit: 200 },
      { category: "Shopping", limit: 250 },
      { category: "Entertainment", limit: 120 },
      { category: "Transport", limit: 150 },
      { category: "Subscriptions", limit: 80 },
    ],
    transactions: [
      tx({ date: daysAgo(2), description: "Monthly salary", amount: 3200, type: "income", category: "Income" }),
      tx({ date: daysAgo(1), description: "Rent", amount: 1150, type: "expense", category: "Housing" }),
      tx({ date: daysAgo(1), description: "Weekly groceries", amount: 78.4, type: "expense", category: "Groceries" }),
      tx({ date: daysAgo(3), description: "Dinner with friends", amount: 64.0, type: "expense", category: "Dining" }),
      tx({ date: daysAgo(4), description: "Spotify", amount: 10.99, type: "expense", category: "Subscriptions" }),
      tx({ date: daysAgo(4), description: "Netflix", amount: 13.99, type: "expense", category: "Subscriptions" }),
      tx({ date: daysAgo(5), description: "Train pass", amount: 49.0, type: "expense", category: "Transport" }),
      tx({ date: daysAgo(6), description: "New headphones", amount: 229.0, type: "expense", category: "Shopping" }),
      tx({ date: daysAgo(7), description: "Groceries", amount: 53.2, type: "expense", category: "Groceries" }),
      tx({ date: daysAgo(8), description: "Cinema", amount: 24.0, type: "expense", category: "Entertainment" }),
      tx({ date: daysAgo(9), description: "Pharmacy", amount: 18.5, type: "expense", category: "Health" }),
      tx({ date: daysAgo(11), description: "Coffee & lunch", amount: 32.7, type: "expense", category: "Dining" }),
      tx({ date: daysAgo(12), description: "Groceries", amount: 61.9, type: "expense", category: "Groceries" }),
      tx({ date: daysAgo(14), description: "Transfer to savings", amount: 400, type: "expense", category: "Savings" }),
      tx({ date: daysAgo(16), description: "Electricity", amount: 72.0, type: "expense", category: "Housing" }),
      tx({ date: daysAgo(18), description: "Concert tickets", amount: 89.0, type: "expense", category: "Entertainment" }),
      tx({ date: daysAgo(20), description: "Groceries", amount: 47.3, type: "expense", category: "Groceries" }),
      tx({ date: daysAgo(22), description: "Fuel", amount: 58.0, type: "expense", category: "Transport" }),
      tx({ date: daysAgo(33), description: "Monthly salary", amount: 3200, type: "income", category: "Income" }),
      tx({ date: daysAgo(34), description: "Rent", amount: 1150, type: "expense", category: "Housing" }),
      tx({ date: daysAgo(36), description: "Weekend trip", amount: 312.0, type: "expense", category: "Travel" }),
      tx({ date: daysAgo(40), description: "Groceries", amount: 69.1, type: "expense", category: "Groceries" }),
      tx({ date: daysAgo(45), description: "Restaurant", amount: 88.0, type: "expense", category: "Dining" }),
    ],
  };
}
