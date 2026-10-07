const PAPER_ONLY = "PAPER_ONLY";

export class PaperExecution {
  constructor(portfolio, mode = PAPER_ONLY) {
    if (mode !== PAPER_ONLY) throw new Error("Execution is permanently locked to PAPER_ONLY");
    this.portfolio = portfolio;
    this.mode = PAPER_ONLY;
  }

  buy({ symbol, quantity, ask, entryFeeEur, expectedProfitEur = 0, stopLoss, takeProfit, timestamp }) {
    if (this.mode !== PAPER_ONLY) throw new Error("Safety lock");
    if (!(quantity > 0) || !(ask > 0) || entryFeeEur < 0) throw new Error("Invalid simulated buy");
    const costEur = quantity * ask;
    this.portfolio.open({
      symbol, quantity, entryPrice: ask, currentPrice: ask, costEur,
      entryFeeEur, expectedProfitEur, unrealizedPnlEur: 0,
      stopLoss, takeProfit, openedAt: timestamp, closedAt: null
    });
    return { type: "PAPER_BUY", symbol, quantity, price: ask, costEur, entryFeeEur, timestamp };
  }

  sell({ symbol, bid, exitFeeEur, timestamp }) {
    if (this.mode !== PAPER_ONLY) throw new Error("Safety lock");
    const result = this.portfolio.close(symbol, bid, exitFeeEur, timestamp);
    return { type: "PAPER_SELL", symbol, price: bid, exitFeeEur, pnlEur: result.pnl, timestamp };
  }
}
