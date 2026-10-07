import test from "node:test";
import assert from "node:assert/strict";
import { estimateCosts, evaluateSignal } from "../src/strategy.js";
import { PaperExecution } from "../src/paper-execution.js";
import { PaperPortfolio } from "../src/portfolio.js";

test("cost model includes fees, spread and slippage", () => {
  const c = estimateCosts({ price: 100, amountEur: 25, bid: 99.99, ask: 100.01, feeRate: 0.001, slippageRate: 0.0005 });
  assert.ok(c.total > c.fees);
  assert.ok(c.spreadPct > 0);
});

test("signal rejects insufficient expected profit", () => {
  const cfg = { startingCapitalEur: 100, minNetProfitEur: 0.10, maxPositionFraction: 0.25, maxSpreadPct: 0.2, feeRate: 0.001, estimatedSlippageRate: 0.0005 };
  const candles = Array.from({ length: 16 }, (_, i) => ({ close: 100 + i * 0.001 }));
  const market = { symbol: "TEST/USDT", bid: 99.999, ask: 100.001, liquid: true, maxTradableEur: 25 };
  const signal = evaluateSignal(market, candles, cfg);
  assert.equal(signal.eligible, false);
});

test("execution cannot leave paper mode", () => {
  const portfolio = new PaperPortfolio(100);
  assert.throws(() => new PaperExecution(portfolio, "LIVE"));
});

test("portfolio never spends more than available cash", () => {
  const portfolio = new PaperPortfolio(100);
  const execution = new PaperExecution(portfolio);
  assert.throws(() => execution.buy({ symbol: "BTC/USDT", quantity: 2, ask: 100, entryFeeEur: 0, timestamp: new Date().toISOString() }));
});
