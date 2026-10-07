export function analyzeMomentum(candles) {
  if (candles.length < 16) throw new Error("At least 16 one-minute candles are required");
  const closes = candles.map(c => c.close);
  const pct = (a, b) => a > 0 && b > 0 ? (b / a - 1) * 100 : 0;
  const returns = closes.slice(1).map((v, i) => pct(closes[i], v));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const volumeNow = candles.at(-1)?.volume ?? 0;
  const volumeAvg = candles.slice(-15).reduce((s, c) => s + (c.volume ?? 0), 0) / 15;
  return {
    oneMinutePct: pct(closes.at(-2), closes.at(-1)),
    fiveMinutePct: pct(closes.at(-6), closes.at(-1)),
    fifteenMinutePct: pct(closes.at(-16), closes.at(-1)),
    volatilityPct: Math.sqrt(variance),
    volumeRatio: volumeAvg > 0 ? volumeNow / volumeAvg : 0
  };
}

export function estimateCosts({ amountEur, bid, ask, feeRate, slippageRate }) {
  if (!(amountEur > 0) || !(bid > 0) || !(ask >= bid)) throw new Error("Invalid market cost inputs");
  const mid = (ask + bid) / 2;
  const spreadPct = ((ask - bid) / mid) * 100;
  const spreadCost = amountEur * (spreadPct / 100);
  const fees = amountEur * feeRate * 2;
  const slippage = amountEur * slippageRate * 2;
  return { spreadPct, fees, spreadCost, slippage, total: fees + spreadCost + slippage };
}

export function evaluateSignal(market, candles, config) {
  const momentum = analyzeMomentum(candles);
  const amountEur = Math.min(config.startingCapitalEur * config.maxPositionFraction, market.maxTradableEur ?? 0);
  const costs = estimateCosts({
    amountEur, bid: market.bid, ask: market.ask,
    feeRate: config.feeRate, slippageRate: config.estimatedSlippageRate
  });
  const expectedMovePct = Math.max(momentum.fiveMinutePct, momentum.fifteenMinutePct, 0);
  const expectedGross = amountEur * expectedMovePct / 100;
  const expectedNet = expectedGross - costs.total;
  const reasons = [];

  if (!market.liquid) reasons.push("liquidity too low");
  if ((market.orderBookDepthEur ?? 0) < amountEur * config.minDepthMultiple) reasons.push("order-book depth too low");
  if (costs.spreadPct > config.maxSpreadPct) reasons.push("spread too wide");
  if (momentum.oneMinutePct <= 0 || momentum.fiveMinutePct <= 0 || momentum.fifteenMinutePct <= 0) reasons.push("momentum not positive across horizons");
  if (momentum.volumeRatio < config.minVolumeRatio) reasons.push("volume confirmation too weak");
  if (expectedNet < config.minNetProfitEur) reasons.push("expected net profit below minimum");

  return {
    symbol: market.symbol,
    eligible: reasons.length === 0,
    market,
    momentum,
    costs,
    expectedGross,
    expectedNet,
    rejectionReasons: reasons
  };
}
