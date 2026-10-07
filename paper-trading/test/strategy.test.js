import test from "node:test";
import assert from "node:assert/strict";
import { estimateCosts, evaluateSignal } from "../src/strategy.js";
import { PaperExecution } from "../src/paper-execution.js";
import { PaperPortfolio } from "../src/portfolio.js";

const cfg = {
  startingCapitalEur: 100, minNetProfitEur: 0.10, maxPositionFraction: 0.25,
  maxSpreadPct: 0.2, minDepthMultiple: 3, minVolumeRatio: 1.1,
  minVolatilityPct: 0.005, targetVolatilityPct: 0.04, maxVolatilityPct: 0.35,
  minSignalScore: 60, maxOpenPositions: 2, feeRate: 0.001, estimatedSlippageRate: 0.0005
};

test("cost model includes fees, spread and slippage", () => {
  const c = estimateCosts({ amountEur: 25, bid: 99.99, ask: 100.01, feeRate: 0.001, slippageRate: 0.0005 });
  assert.ok(c.total > c.fees);
  assert.ok(c.spreadPct > 0);
});

test("weak signal is rejected", () => {
  const candles = Array.from({ length: 16 }, (_, i) => ({ close: 100 + i * 0.001, volume: 100 }));
  const market = { symbol: "TEST/USDT", bid: 99.999, ask: 100.001, spreadPct: 0.002, liquid: true, orderBookDepthEur: 1000, maxTradableEur: 25 };
  const signal = evaluateSignal(market, candles, cfg);
  assert.equal(signal.eligible, false);
  assert.ok(signal.rejectionReasons.length > 0);
});

test("execution cannot leave paper mode", () => {
  const portfolio = new PaperPortfolio(100);
  assert.throws(() => new PaperExecution(portfolio, "LIVE"));
});

test("portfolio never spends more than available cash", () => {
  const portfolio = new PaperPortfolio(100);
  const execution = new PaperExecution(portfolio);
  assert.throws(() => execution.buy({ symbol: "BTC/USDT", quantity: 2, ask: 100, entryFeeEur: 0, stopLoss: 99, takeProfit: 102, timestamp: new Date().toISOString() }));
});

test("entry fees reduce available virtual cash", () => {
  const portfolio = new PaperPortfolio(100);
  const execution = new PaperExecution(portfolio);
  execution.buy({ symbol: "BTC/USDT", quantity: 0.1, ask: 100, entryFeeEur: 0.01, stopLoss: 99, takeProfit: 102, timestamp: new Date().toISOString() });
  assert.equal(portfolio.cashEur, 89.99);
});

test("position limit is enforced", () => {
  const portfolio = new PaperPortfolio(100);
  const execution = new PaperExecution(portfolio, "PAPER_ONLY", { maxOpenPositions: 1 });
  execution.buy({ symbol: "BTC/USDT", quantity: 0.1, ask: 100, entryFeeEur: 0, stopLoss: 99, takeProfit: 102, timestamp: new Date().toISOString() });
  assert.throws(() => execution.buy({ symbol: "ETH/USDT", quantity: 0.1, ask: 100, entryFeeEur: 0, stopLoss: 99, takeProfit: 102, timestamp: new Date().toISOString() }));
});

test("stop loss creates a simulated sell", () => {
  const portfolio = new PaperPortfolio(100);
  const execution = new PaperExecution(portfolio);
  execution.buy({ symbol: "BTC/USDT", quantity: 0.1, ask: 100, entryFeeEur: 0, stopLoss: 99, takeProfit: 102, timestamp: new Date().toISOString() });
  const exit = execution.checkExit("BTC/USDT", 98, new Date().toISOString(), 0.001);
  assert.equal(exit.reason, "STOP_LOSS");
  assert.equal(portfolio.positions.size, 0);
});
