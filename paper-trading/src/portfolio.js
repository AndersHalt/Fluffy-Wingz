export class PaperPortfolio {
  constructor(startingCapitalEur = 100) {
    this.cashEur = startingCapitalEur;
    this.positions = new Map();
    this.realizedPnlEur = 0;
  }

  open(position) {
    if (position.costEur > this.cashEur) throw new Error("Insufficient virtual cash");
    if (position.costEur <= 0) throw new Error("Invalid position size");
    this.cashEur -= position.costEur;
    this.positions.set(position.symbol, position);
  }

  mark(symbol, currentPrice) {
    const p = this.positions.get(symbol);
    if (!p) return null;
    p.currentPrice = currentPrice;
    p.unrealizedPnlEur = (currentPrice - p.entryPrice) * p.quantity - p.entryFeeEur;
    return p.unrealizedPnlEur;
  }

  close(symbol, exitPrice, exitFeeEur) {
    const p = this.positions.get(symbol);
    if (!p) throw new Error("Position not found");
    const proceeds = p.quantity * exitPrice - exitFeeEur;
    const pnl = proceeds - p.costEur - p.entryFeeEur;
    this.cashEur += proceeds;
    this.realizedPnlEur += pnl;
    this.positions.delete(symbol);
    return { pnl, cashEur: this.cashEur };
  }

  summary(prices = {}) {
    let unrealized = 0;
    for (const [symbol, p] of this.positions) {
      const price = prices[symbol] ?? p.currentPrice ?? p.entryPrice;
      unrealized += (price - p.entryPrice) * p.quantity - p.entryFeeEur;
    }
    return {
      cashEur: this.cashEur,
      realizedPnlEur: this.realizedPnlEur,
      unrealizedPnlEur: unrealized,
      equityEur: this.cashEur + [...this.positions.values()].reduce((s, p) => s + p.quantity * (prices[p.symbol] ?? p.entryPrice), 0)
    };
  }
}
