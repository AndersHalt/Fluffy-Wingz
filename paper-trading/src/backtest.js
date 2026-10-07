import fs from "node:fs/promises";
import { evaluateSignal } from "./strategy.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run backtest -- ./data/candles.json");
  process.exit(1);
}
const data = JSON.parse(await fs.readFile(file, "utf8"));
for (const item of data) {
  const signal = evaluateSignal(item.market, item.candles, item.config);
  console.log(JSON.stringify(signal));
}
