export function analyzeMomentum(candles) {
  if (candles.length < 16) throw new Error("At least 16 one-minute candles are required");
  const closes = candles.map(c => c.close);
  const pct = (a, b) => a > 0 && b > 0 ? (b / a - 1) * 100 : 0;
  const returns = closes.slice(1).map((v, i) => pct(closes[i], v));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const volumeNow = candles.at(-1)?.volume ?? 0;
  const volumeAvg = candles.slice(-15).reduce((s, c) => s + (c.volume ?? 0), 0) / 15;
  const high = Math.max(...candles.slice(-15).map(c => c.high ?? c.close));
  const low = Math.min(...candles.slice(-15).map(c => c.low ?? c.close));
  const last = closes.at(-1);
  return {
    oneMinutePct: pct(closes.at(-2), last),
    fiveMinutePct: pct(closes.at(-6), last),
    fifteenMinutePct: pct(closes.at(-16), last),
    volatilityPct: Math.sqrt(variance),
    volumeRatio: volumeAvg > 0 ? volumeNow / volumeAvg : 0,
    range15Pct: pct(low, high)
  };
}

export function estimateCosts({ amountEur, bid, ask, feeRate, slippageRate }) {
  if (!(amountEur > 0) || !(bid > 0) || !(ask >= bid)) throw new Error("Invalid market cost inputs");
  const mid = (ask + bid) / 2;
  const spreadPct = ((ask - bid) / mid) * 100;
  const spreadCost = amountEur * spreadPct / 100;
  const fees = amountEur * feeRate * 2;
  const slippage = amountEur * slippageRate * 2;
  return { spreadPct, fees, spreadCost, slippage, total: fees + spreadCost + slippage };
}

export function calculateSignalScore(market, momentum, config) {
  let score = 0;
  const components = {};
  components.momentum = Math.min(35, Math.max(0, momentum.oneMinutePct * 8 + momentum.fiveMinutePct * 4 + momentum.fifteenMinutePct * 2));
  components.volume = Math.min(20, Math.max(0, (momentum.volumeRatio - 1) * 25));
  components.liquidity = market.liquid ? 15 : 0;
  components.depth = (market.orderBookDepthEur ?? 0) >= (market.maxTradableEur ?? 1) * config.minDepthMultiple ? 10 : 0;
  components.spread = market.spreadPct <= config.maxSpreadPct ? 10 : Math.max(0, 10 - market.spreadPct * 10);
  components.volatility = momentum.volatilityPct >= config.minVolatilityPct && momentum.volatilityPct <= config.maxVolatilityPct ? 10 : 0;
  score = Object.values(components).reduce((a, b) => a + b, 0);
  return { score: Math.round(score * 100) / 100, components };
}

export function calculatePositionSize({ cashEur, market, score, momentum, config }) {
  if (score < config.minSignalScore) return 0;
  const scoreFactor = Math.min(1, score / 100);
  const volatilityFactor = Math.max(0.35, Math.min(1, config.targetVolatilityPct / Math.max(momentum.volatilityPct, 0.0001)));
  const amount = cashEur * config.maxPositionFraction * scoreFactor * volatilityFactor;
  return Math.min(amount, market.maxTradableEur ?? 0);
}

export function evaluateSignal(market, candles, config, availableCashEur = config.startingCapitalEur) {
  const momentum = analyzeMomentum(candles);
  const costsBaseAmount = Math.min(availableCashEur * config.maxPositionFraction, market.maxTradableEur ?? 0);
  const costs = estimateCosts({
    amountEur: Math.max(costsBaseAmount, 0.01), bid: market.bid, ask: market.ask,
    feeRate: config.feeRate, slippageRate: config.estimatedSlippageRate
  });
  const score = calculateSignalScore(market, momentum, config);
  const amountEur = calculatePositionSize({ cashEur: availableCashEur, market, score: score.score, momentum, config });
  const expectedMovePct = Math.max(momentum.fiveMinutePct * 0.65 + momentum.fifteenMinutePct * 0.35, 0);
  const expectedGross = amountEur * expectedMovePct / 100;
  const expectedNet = expectedGross - costs.total * (amountEur / Math.max(costsBaseAmount, 0.01));
  const reasons = [];

  if (!market.liquid) reasons.push("liquidity too low");
  if ((market.orderBookDepthEur ?? 0) < amountEur * config.minDepthMultiple) reasons.push("order-book depth too low");
  if (costs.spreadPct > config.maxSpreadPct) reasons.push("spread too wide");
  if (momentum.oneMinutePct <= 0 || momentum.fiveMinutePct <= 0 || momentum.fifteenMinutePct <= 0) reasons.push("momentum not positive across horizons");
  if (momentum.volumeRatio < config.minVolumeRatio) reasons.push("volume confirmation too weak");
  if (momentum.volatilityPct < config.minVolatilityPct) reasons.push("volatility too low");
  if (momentum.volatilityPct > config.maxVolatilityPct) reasons.push("volatility too high");
  if (score.score < config.minSignalScore) reasons.push("signal score too low");
  if (amountEur <= 0) reasons.push("no safe position size");
  if (expectedNet < config.minNetProfitEur) reasons.push("expected net profit below minimum");

  return {
    symbol: market.symbol,
    eligible: reasons.length === 0,
    market, momentum, score, amountEur, costs,
    expectedMovePct, expectedGross, expectedNet,
    rejectionReasons: reasons
  };
}
