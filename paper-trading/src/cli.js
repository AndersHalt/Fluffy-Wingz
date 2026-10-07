import fs from "node:fs/promises";
import { PublicBinanceMarketData } from "./market-data.js";
import { evaluateSignal } from "./strategy.js";
import { PaperPortfolio } from "./portfolio.js";
import { PaperExecution } from "./paper-execution.js";
import { TradeLogger } from "./logger.js";

const config = JSON.parse(await fs.readFile(new URL("../config.json", import.meta.url), "utf8"));
if (config.mode !== "PAPER_ONLY") throw new Error("Safety invariant violated: PAPER_ONLY is required");

const portfolio = new PaperPortfolio(config.startingCapitalEur);
const execution = new PaperExecution(portfolio, "PAPER_ONLY", config);
const feed = new PublicBinanceMarketData();
const logger = new TradeLogger();
const signals = [];

for (const symbol of config.symbols) {
  try {
    const candles = await feed.candles(symbol, 100);
    const market = await feed.snapshot(symbol, config.startingCapitalEur * config.maxPositionFraction);
    signals.push(evaluateSignal(market, candles, config, portfolio.cashEur));
  } catch (error) {
    signals.push({ symbol, eligible: false, rejectionReasons: [error instanceof Error ? error.message : String(error)] });
  }
}

signals.sort((a, b) => (b.score?.score ?? -Infinity) - (a.score?.score ?? -Infinity));

for (const signal of signals) {
  if (!signal.eligible || portfolio.positions.size >= config.maxOpenPositions) {
    await logger.append({ type: "SIGNAL_REJECTED", symbol: signal.symbol, reasons: signal.rejectionReasons, score: signal.score?.score ?? null });
    console.log(JSON.stringify({ symbol: signal.symbol, status: "REJECTED", score: signal.score?.score ?? null, reasons: signal.rejectionReasons }));
    continue;
  }

  const market = signal.market;
  const amount = signal.amountEur;
  const quantity = amount / market.ask;
  const atrProxy = Math.max(market.price * signal.momentum.volatilityPct / 100, market.price * 0.001);
  const stopLoss = market.ask - atrProxy * config.stopLossAtrMultiple;
  const takeProfit = market.ask + atrProxy * config.takeProfitAtrMultiple;
  const trade = execution.buy({
    symbol: signal.symbol, quantity, ask: market.ask,
    entryFeeEur: amount * config.feeRate,
    expectedProfitEur: signal.expectedNet,
    stopLoss, takeProfit, timestamp: new Date().toISOString()
  });
  await logger.append({ ...trade, signal });
  console.log(JSON.stringify({ ...trade, score: signal.score.score, expectedNetEur: signal.expectedNet }));
}

console.log(JSON.stringify({ portfolio: portfolio.summary() }, null, 2));
