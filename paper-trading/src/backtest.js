import fs from "node:fs/promises";
import { PaperPortfolio } from "./portfolio.js";
import { PaperExecution } from "./paper-execution.js";
import { evaluateSignal } from "./strategy.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run backtest -- ./data/candles.json");
  process.exit(1);
}

const input = JSON.parse(await fs.readFile(file, "utf8"));
const candles = input.candles;
const config = input.config;
const symbol = input.market?.symbol ?? "UNKNOWN/USDT";
if (!Array.isArray(candles) || candles.length < 20) throw new Error("Backtest requires at least 20 one-minute candles");

const portfolio = new PaperPortfolio(config.startingCapitalEur);
const execution = new PaperExecution(portfolio, "PAPER_ONLY", config);
let trades = 0;
let wins = 0;
let losses = 0;
let rejected = 0;

for (let i = 16; i < candles.length; i++) {
  const window = candles.slice(0, i + 1);
  const close = candles[i].close;
  const spread = input.market?.spreadPct ?? config.maxSpreadPct / 2;
  const bid = close * (1 - spread / 200);
  const ask = close * (1 + spread / 200);
  const market = {
    symbol,
    price: close,
    bid,
    ask,
    spreadPct: spread,
    liquid: true,
    orderBookDepthEur: Math.max(1000, portfolio.cashEur * config.minDepthMultiple),
    maxTradableEur: Math.min(portfolio.cashEur, config.startingCapitalEur * config.maxPositionFraction)
  };

  for (const position of [...portfolio.positions.values()]) {
    const exit = execution.checkExit(position.symbol, close, candles[i].timestamp ?? new Date().toISOString(), config.feeRate);
    if (exit) {
      trades++;
      if (exit.pnlEur >= 0) wins++; else losses++;
      continue;
    }
    portfolio.mark(position.symbol, close);
  }

  if (portfolio.positions.size >= config.maxOpenPositions) continue;

  const signal = evaluateSignal(market, window, config, portfolio.cashEur);
  if (!signal.eligible) {
    rejected++;
    continue;
  }

  const amount = signal.amountEur;
  if (amount <= 0) continue;
  const quantity = amount / ask;
  const volatilityMove = Math.max(close * signal.momentum.volatilityPct / 100, close * 0.001);
  execution.buy({
    symbol,
    quantity,
    ask,
    entryFeeEur: amount * config.feeRate,
    expectedProfitEur: signal.expectedNet,
    stopLoss: ask - volatilityMove * config.stopLossAtrMultiple,
    takeProfit: ask + volatilityMove * config.takeProfitAtrMultiple,
    timestamp: candles[i].timestamp ?? new Date().toISOString()
  });
}

for (const position of [...portfolio.positions.values()]) {
  const last = candles.at(-1).close;
  const exit = execution.sell({
    symbol: position.symbol,
    bid: last * (1 - (input.market?.spreadPct ?? 0.1) / 200),
    exitFeeEur: position.quantity * last * config.feeRate,
    timestamp: candles.at(-1).timestamp ?? new Date().toISOString(),
    reason: "BACKTEST_END"
  });
  trades++;
  if (exit.pnlEur >= 0) wins++; else losses++;
}

const summary = portfolio.summary();
console.log(JSON.stringify({
  status: "BACKTEST_COMPLETE",
  symbol,
  startingCapitalEur: config.startingCapitalEur,
  endingEquityEur: summary.equityEur,
  pnlEur: summary.realizedPnlEur,
  returnPct: (summary.equityEur / config.startingCapitalEur - 1) * 100,
  trades, wins, losses, rejectedSignals: rejected,
  winRatePct: trades ? wins / trades * 100 : 0,
  maxOpenPositions: config.maxOpenPositions
}, null, 2));
