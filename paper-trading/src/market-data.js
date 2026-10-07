const BINANCE_BASE = "https://api.binance.com";

async function getJson(path) {
  const response = await fetch(BINANCE_BASE + path, { method: "GET" });
  if (!response.ok) throw new Error(`Market data HTTP ${response.status}`);
  return response.json();
}

export class PublicBinanceMarketData {
  async snapshot(symbol, amountEur = 25) {
    const encoded = encodeURIComponent(symbol.replace("/", ""));
    const [ticker, book] = await Promise.all([
      getJson(`/api/v3/ticker/24hr?symbol=${encoded}`),
      getJson(`/api/v3/depth?symbol=${encoded}&limit=20`)
    ]);
    const bid = Number(book.bids?.[0]?.[0]);
    const ask = Number(book.asks?.[0]?.[0]);
    const depthEur = (book.bids ?? []).slice(0, 10).reduce((s, x) => s + Number(x[0]) * Number(x[1]), 0);
    return {
      symbol, price: Number(ticker.lastPrice), bid, ask,
      spreadPct: ((ask - bid) / ((ask + bid) / 2)) * 100,
      volume24h: Number(ticker.quoteVolume),
      liquid: Number(ticker.quoteVolume) > 1_000_000,
      orderBookDepthEur: depthEur,
      maxTradableEur: Math.min(amountEur, depthEur / 3)
    };
  }

  async candles(symbol, limit = 100) {
    const encoded = encodeURIComponent(symbol.replace("/", ""));
    const rows = await getJson(`/api/v3/klines?symbol=${encoded}&interval=1m&limit=${limit}`);
    return rows.map(r => ({
      timestamp: new Date(Number(r[0])).toISOString(),
      open: Number(r[1]), high: Number(r[2]), low: Number(r[3]),
      close: Number(r[4]), volume: Number(r[5])
    }));
  }
}

// Deterministic offline provider for tests and local development.
export class SimulatedMarketData {
  async snapshot(symbol, candles) {
    const last = candles.at(-1)?.close ?? 1;
    return {
      symbol, price: last, bid: last * 0.9995, ask: last * 1.0005,
      spreadPct: 0.1, volume24h: 1_000_000, liquid: true,
      orderBookDepthEur: 10_000, maxTradableEur: 25
    };
  }
}
