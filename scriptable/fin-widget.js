// Fin — Lockscreen widget for Scriptable (iOS)
// -----------------------------------------------------------------------------
// Setup:
//   1. Install the free "Scriptable" app from the App Store.
//   2. Open the Fin dashboard -> "Lockscreen widget" card -> copy your
//      ENDPOINT URL and TOKEN, and paste them below.
//   3. In Scriptable: tap + , paste this whole file, name it "Fin".
//   4. Lockscreen -> hold -> Customize -> add a Scriptable widget ->
//      choose script "Fin". (Also works as a Home Screen widget.)
//
// The token is a secret: anyone with it can read your summary numbers.
// Rotate it from the dashboard if it ever leaks.
// -----------------------------------------------------------------------------

const ENDPOINT = "https://YOUR-DOMAIN.vercel.app/api/widget"; // <- paste
const TOKEN = "PASTE-YOUR-TOKEN-HERE"; // <- paste

const BRAND = new Color("#818cf8");
const GOOD = new Color("#34d399");
const BAD = new Color("#fb7185");
const MUTED = new Color("#94a3b8");

async function fetchData() {
  const req = new Request(ENDPOINT);
  req.headers = { Authorization: `Bearer ${TOKEN}` };
  req.timeoutInterval = 10;
  return req.loadJSON();
}

function money(amount, currency) {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (e) {
    return `${currency || "EUR"} ${Math.round(amount)}`;
  }
}

function errorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0b1020");
  const t = w.addText("Fin");
  t.textColor = BRAND;
  t.font = Font.boldSystemFont(13);
  w.addSpacer(2);
  const e = w.addText(message);
  e.textColor = MUTED;
  e.font = Font.systemFont(10);
  return w;
}

function buildWidget(data) {
  const family = config.widgetFamily || "accessoryRectangular";
  const positive = data.net30 >= 0;

  // --- Lockscreen: inline (tiny single line) ---
  if (family === "accessoryInline") {
    const w = new ListWidget();
    w.addText(`${money(data.balance, data.currency)} · ${data.savingsRate}% saved`);
    return w;
  }

  // --- Lockscreen: circular (savings rate ring-style text) ---
  if (family === "accessoryCircular") {
    const w = new ListWidget();
    const stack = w.addStack();
    stack.layoutVertically();
    stack.centerAlignContent();
    const pct = stack.addText(`${data.savingsRate}%`);
    pct.font = Font.boldSystemFont(16);
    pct.centerAlignText();
    const lbl = stack.addText("saved");
    lbl.font = Font.systemFont(8);
    lbl.textColor = MUTED;
    lbl.centerAlignText();
    return w;
  }

  // --- Lockscreen rectangular + Home Screen small/medium ---
  const w = new ListWidget();
  const isHome = family === "small" || family === "medium" || family === "large";
  if (isHome) {
    w.backgroundColor = new Color("#0b1020");
    w.setPadding(14, 14, 14, 14);
  }

  const header = w.addText("Fin · balance");
  header.font = Font.mediumSystemFont(isHome ? 12 : 11);
  header.textColor = isHome ? MUTED : Color.gray();

  w.addSpacer(2);
  const bal = w.addText(money(data.balance, data.currency));
  bal.font = Font.boldSystemFont(isHome ? 26 : 20);
  if (isHome) bal.textColor = Color.white();

  w.addSpacer(isHome ? 8 : 3);

  const line = w.addText(
    `30d: ${positive ? "+" : ""}${money(data.net30, data.currency)} · ${data.savingsRate}% saved`
  );
  line.font = Font.systemFont(isHome ? 12 : 10);
  line.textColor = positive ? GOOD : BAD;

  if (isHome && data.topCategory) {
    w.addSpacer(2);
    const top = w.addText(
      `Top: ${data.topCategory.category} ${money(data.topCategory.amount, data.currency)}`
    );
    top.font = Font.systemFont(11);
    top.textColor = MUTED;
  }

  return w;
}

let widget;
try {
  const data = await fetchData();
  widget = data && data.error ? errorWidget("Invalid token") : buildWidget(data);
} catch (e) {
  widget = errorWidget("Can't reach Fin");
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
