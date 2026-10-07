import fs from "node:fs/promises";
import { PaperPortfolio } from "./portfolio.js";
import { PaperExecution } from "./paper-execution.js";
import { evaluateSignal } from "./strategy.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run backtest -- ./data/candles.json");
  process.exit(1);
}

const { candles, market, config } = JSON.parse(await fs.readFile(file, "utf8"));
const portfolio = new PaperPortfolio(config.startingCapitalEur);
const execution = new PaperExecution(portfolio, "PAPER_ONLY");
const signal = evaluateSignal(market, candles, config);

if (!signal.eligible) {
  console.log(JSON.stringify({ status: "NO_TRADE", reasons: signal.rejectionReasons, signal }, null, 2));
  process.exit(0);
}

const amount = Math.min(portfolio.cashEur, config.startingCapitalEur * config.maxPositionFraction, market.maxTradableEur);
const quantity = amount / market.ask;
execution.buy({
  symbol: market.symbol,
  quantity,
  ask: market.ask,
  entryFeeEur: amount * config.feeRate,
  expectedProfitEur: signal.expectedNet,
  stopLoss: market.ask * 0.99,
  takeProfit: market.ask * 1.02,
  timestamp: new Date().toISOString()
});

const exitPrice = market.bid * (1 + Math.max(signal.momentum.fiveMinutePct, 0) / 100);
execution.sell({
  symbol: market.symbol,
  bid: exitPrice,
  exitFeeEur: quantity * exitPrice * config.feeRate,
  timestamp: new Date().toISOString()
});

console.log(JSON.stringify({ status: "PAPER_BACKTEST_TRADE", signal, portfolio: portfolio.summary() }, null, 2));
