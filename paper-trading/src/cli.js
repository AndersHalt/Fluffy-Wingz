import fs from "node:fs/promises";
import { PublicBinanceMarketData } from "./market-data.js";
import { evaluateSignal } from "./strategy.js";
import { PaperPortfolio } from "./portfolio.js";
import { PaperExecution } from "./paper-execution.js";
import { TradeLogger } from "./logger.js";

const config = JSON.parse(await fs.readFile(new URL("../config.json", import.meta.url), "utf8"));
if (config.mode !== "PAPER_ONLY") throw new Error("Safety invariant violated: PAPER_ONLY is required");

const portfolio = new PaperPortfolio(config.startingCapitalEur);
const execution = new PaperExecution(portfolio, "PAPER_ONLY");
const feed = new PublicBinanceMarketData();
const logger = new TradeLogger();

for (const symbol of config.symbols) {
  try {
    const candles = await feed.candles(symbol, 100);
    const market = await feed.snapshot(symbol, config.startingCapitalEur * config.maxPositionFraction);
    const signal = evaluateSignal(market, candles, config);

    if (!signal.eligible) {
      const event = { type: "SIGNAL_REJECTED", symbol, reasons: signal.rejectionReasons, signal };
      await logger.append(event);
      console.log(JSON.stringify({ symbol, status: "REJECTED", reasons: signal.rejectionReasons }));
      continue;
    }

    const amount = Math.min(portfolio.cashEur, config.startingCapitalEur * config.maxPositionFraction, market.maxTradableEur);
    if (amount <= 0) continue;
    const quantity = amount / market.ask;
    const entryFeeEur = amount * config.feeRate;
    const expectedProfitEur = signal.expectedNet;
    const trade = execution.buy({
      symbol, quantity, ask: market.ask, entryFeeEur,
      expectedProfitEur, stopLoss: market.ask * 0.99,
      takeProfit: market.ask * 1.02, timestamp: new Date().toISOString()
    });
    await logger.append({ ...trade, signal });
    console.log(JSON.stringify({ ...trade, expectedNetEur: expectedProfitEur }));
  } catch (error) {
    const event = { type: "ERROR", symbol, message: error instanceof Error ? error.message : String(error) };
    await logger.append(event);
    console.log(JSON.stringify(event));
  }
}

console.log(JSON.stringify({ portfolio: portfolio.summary() }, null, 2));
