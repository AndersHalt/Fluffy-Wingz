import fs from "node:fs/promises";
import { SimulatedMarketData } from "./market-data.js";
import { evaluateSignal } from "./strategy.js";
import { PaperPortfolio } from "./portfolio.js";
import { PaperExecution } from "./paper-execution.js";

const config = JSON.parse(await fs.readFile(new URL("../config.json", import.meta.url), "utf8"));
const portfolio = new PaperPortfolio(config.startingCapitalEur);
const execution = new PaperExecution(portfolio, config.mode);
const feed = new SimulatedMarketData();

const candles = Array.from({ length: 16 }, (_, i) => ({ close: 100 + i * 0.12, volume: 1000 + i * 40 }));
for (const symbol of config.symbols) {
  const market = await feed.snapshot(symbol, candles);
  const signal = evaluateSignal(market, candles, config);
  if (signal.eligible) {
    const amount = Math.min(config.startingCapitalEur * config.maxPositionFraction, market.maxTradableEur);
    const quantity = amount / market.ask;
    const trade = execution.buy({
      symbol, quantity, ask: market.ask,
      entryFeeEur: amount * config.feeRate,
      stopLoss: market.ask * 0.99,
      takeProfit: market.ask * 1.02,
      timestamp: new Date().toISOString()
    });
    console.log(JSON.stringify(trade));
  } else {
    console.log(JSON.stringify({ type: "SIGNAL_REJECTED", symbol, reasons: signal.rejectionReasons }));
  }
}
console.log(JSON.stringify({ portfolio: portfolio.summary() }, null, 2));
