"use client";

import { formatMoney } from "@/lib/finance";

const PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#64748b",
];

export function DonutChart({
  data,
  currency,
}: {
  data: { category: string; amount: number }[];
  currency: string;
}) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total <= 0) {
    return <p className="text-sm text-slate-400">No spending yet this period.</p>;
  }

  const radius = 70;
  const stroke = 26;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
        <g transform="translate(90,90) rotate(-90)">
          {data.map((d, i) => {
            const frac = d.amount / total;
            const dash = frac * circ;
            const seg = (
              <circle
                key={d.category}
                r={radius}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x="90" y="84" textAnchor="middle" className="fill-slate-400 text-[11px]">
          30-day spend
        </text>
        <text x="90" y="104" textAnchor="middle" className="fill-white text-[15px] font-semibold">
          {formatMoney(total, currency)}
        </text>
      </svg>

      <ul className="space-y-1.5 text-sm">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.category} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-slate-300">{d.category}</span>
            <span className="ml-auto tabular-nums text-slate-400">
              {formatMoney(d.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({
  data,
  currency,
}: {
  data: { month: string; income: number; expense: number }[];
  currency: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  return (
    <div>
      <div className="flex items-end gap-3 h-40">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div className="flex items-end gap-1 h-full w-full justify-center">
              <div
                className="w-3.5 rounded-t bg-emerald-500/80"
                style={{ height: `${(d.income / max) * 100}%` }}
                title={`Income ${formatMoney(d.income, currency)}`}
              />
              <div
                className="w-3.5 rounded-t bg-indigo-500/80"
                style={{ height: `${(d.expense / max) * 100}%` }}
                title={`Spend ${formatMoney(d.expense, currency)}`}
              />
            </div>
            <span className="text-[10px] text-slate-500">{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500/80" /> Spending
        </span>
      </div>
    </div>
  );
}
