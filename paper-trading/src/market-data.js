export class SimulatedMarketData {
  constructor(seed = 42) {
    this.seed = seed;
  }

  async snapshot(symbol, candles) {
    const last = candles.at(-1)?.close ?? 1;
    return {
      symbol,
      price: last,
      bid: last * 0.9995,
      ask: last * 1.0005,
      volume24h: 1000000,
      liquid: true,
      orderBookDepthEur: 10000,
      maxTradableEur: 25
    };
  }
}
