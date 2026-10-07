const PAPER_ONLY = "PAPER_ONLY";

export class PaperExecution {
  constructor(portfolio, mode = PAPER_ONLY) {
    if (mode !== PAPER_ONLY) throw new Error("Execution is permanently locked to PAPER_ONLY");
    this.portfolio = portfolio;
    this.mode = PAPER_ONLY;
  }

  buy({ symbol, quantity, ask, entryFeeEur, stopLoss, takeProfit, timestamp }) {
    if (this.mode !== PAPER_ONLY) throw new Error("Safety lock");
    if (!(quantity > 0) || !(ask > 0)) throw new Error("Invalid simulated buy");
    const costEur = quantity * ask;
    this.portfolio.open({
      symbol, quantity, entryPrice: ask, currentPrice: ask, costEur,
      entryFeeEur, expectedProfitEur: 0, unrealizedPnlEur: 0,
      stopLoss, takeProfit, openedAt: timestamp, closedAt: null
    });
    return { type: "PAPER_BUY", symbol, quantity, price: ask, costEur };
  }

  sell({ symbol, bid, exitFeeEur, timestamp }) {
    if (this.mode !== PAPER_ONLY) throw new Error("Safety lock");
    const result = this.portfolio.close(symbol, bid, exitFeeEur);
    return { type: "PAPER_SELL", symbol, price: bid, pnlEur: result.pnl, timestamp };
  }
}
