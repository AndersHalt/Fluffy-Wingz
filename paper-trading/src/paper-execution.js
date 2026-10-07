const PAPER_ONLY = "PAPER_ONLY";

export class PaperExecution {
  constructor(portfolio, mode = PAPER_ONLY, limits = {}) {
    if (mode !== PAPER_ONLY) throw new Error("Execution is permanently locked to PAPER_ONLY");
    this.portfolio = portfolio;
    this.mode = PAPER_ONLY;
    this.maxOpenPositions = limits.maxOpenPositions ?? 2;
  }

  buy({ symbol, quantity, ask, entryFeeEur, expectedProfitEur = 0, stopLoss, takeProfit, timestamp }) {
    if (this.mode !== PAPER_ONLY) throw new Error("Safety lock");
    if (this.portfolio.positions.size >= this.maxOpenPositions) throw new Error("Maximum open paper positions reached");
    if (this.portfolio.positions.has(symbol)) throw new Error("Symbol already has an open paper position");
    if (!(quantity > 0) || !(ask > 0) || entryFeeEur < 0) throw new Error("Invalid simulated buy");
    if (!(stopLoss > 0 && stopLoss < ask)) throw new Error("Invalid stop-loss");
    if (!(takeProfit > ask)) throw new Error("Invalid take-profit");
    const costEur = quantity * ask;
    this.portfolio.open({
      symbol, quantity, entryPrice: ask, currentPrice: ask, costEur,
      entryFeeEur, expectedProfitEur, unrealizedPnlEur: 0,
      stopLoss, takeProfit, openedAt: timestamp, closedAt: null
    });
    return { type: "PAPER_BUY", symbol, quantity, price: ask, costEur, entryFeeEur, stopLoss, takeProfit, timestamp };
  }

  sell({ symbol, bid, exitFeeEur, timestamp, reason = "SIGNAL" }) {
    if (this.mode !== PAPER_ONLY) throw new Error("Safety lock");
    const result = this.portfolio.close(symbol, bid, exitFeeEur, timestamp);
    return { type: "PAPER_SELL", symbol, price: bid, exitFeeEur, pnlEur: result.pnl, reason, timestamp };
  }

  checkExit(symbol, price, timestamp, exitFeeRate) {
    const position = this.portfolio.positions.get(symbol);
    if (!position) return null;
    if (price <= position.stopLoss) {
      return this.sell({ symbol, bid: price, exitFeeEur: position.quantity * price * exitFeeRate, timestamp, reason: "STOP_LOSS" });
    }
    if (price >= position.takeProfit) {
      return this.sell({ symbol, bid: price, exitFeeEur: position.quantity * price * exitFeeRate, timestamp, reason: "TAKE_PROFIT" });
    }
    return null;
  }
}
