export class PaperPortfolio {
  constructor(startingCapitalEur = 100) {
    if (!(startingCapitalEur > 0)) throw new Error("Starting capital must be positive");
    this.cashEur = startingCapitalEur;
    this.positions = new Map();
    this.realizedPnlEur = 0;
  }

  open(position) {
    const totalDebit = position.costEur + position.entryFeeEur;
    if (position.costEur <= 0 || position.entryFeeEur < 0) throw new Error("Invalid position costs");
    if (totalDebit > this.cashEur + 1e-9) throw new Error("Insufficient virtual cash");
    this.cashEur -= totalDebit;
    this.positions.set(position.symbol, position);
  }

  mark(symbol, currentPrice) {
    const p = this.positions.get(symbol);
    if (!p) return null;
    p.currentPrice = currentPrice;
    p.unrealizedPnlEur = (currentPrice - p.entryPrice) * p.quantity;
    return p.unrealizedPnlEur;
  }

  close(symbol, exitPrice, exitFeeEur, timestamp = new Date().toISOString()) {
    const p = this.positions.get(symbol);
    if (!p) throw new Error("Position not found");
    if (!(exitPrice > 0) || exitFeeEur < 0) throw new Error("Invalid simulated sell");
    const grossProceeds = p.quantity * exitPrice;
    const proceeds = grossProceeds - exitFeeEur;
    const pnl = proceeds - p.costEur - p.entryFeeEur;
    this.cashEur += proceeds;
    this.realizedPnlEur += pnl;
    p.currentPrice = exitPrice;
    p.closedAt = timestamp;
    this.positions.delete(symbol);
    return { pnl, cashEur: this.cashEur, grossProceeds };
  }

  summary(prices = {}) {
    let unrealized = 0;
    let positionValue = 0;
    for (const [symbol, p] of this.positions) {
      const price = prices[symbol] ?? p.currentPrice ?? p.entryPrice;
      positionValue += p.quantity * price;
      unrealized += (price - p.entryPrice) * p.quantity;
    }
    return {
      cashEur: this.cashEur,
      availableLiquidityEur: this.cashEur,
      positionValueEur: positionValue,
      realizedPnlEur: this.realizedPnlEur,
      unrealizedPnlEur: unrealized,
      equityEur: this.cashEur + positionValue
    };
  }
}
