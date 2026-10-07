export function analyzeMomentum(candles) {
  const closes = candles.map(c => c.close);
  const pct = (a, b) => a && b ? (b / a - 1) * 100 : 0;
  return {
    oneMinutePct: pct(closes.at(-2), closes.at(-1)),
    fiveMinutePct: pct(closes.at(-6), closes.at(-1)),
    fifteenMinutePct: pct(closes.at(-16), closes.at(-1))
  };
}

export function estimateCosts({ price, amountEur, bid, ask, feeRate, slippageRate }) {
  const spreadPct = ((ask - bid) / ((ask + bid) / 2)) * 100;
  const fees = amountEur * feeRate * 2;
  const spreadCost = amountEur * Math.max(spreadPct, 0) / 100;
  const slippage = amountEur * slippageRate * 2;
  return { spreadPct, fees, spreadCost, slippage, total: fees + spreadCost + slippage };
}

export function evaluateSignal(market, candles, config) {
  const momentum = analyzeMomentum(candles);
  const costs = estimateCosts({ ...market, feeRate: config.feeRate, slippageRate: config.estimatedSlippageRate });
  const amountEur = Math.min(config.startingCapitalEur * config.maxPositionFraction, amountEurForSignal(market, config));
  const expectedGross = amountEur * Math.max(momentum.fiveMinutePct / 100, momentum.fifteenMinutePct / 100, 0);
  const expectedNet = expectedGross - costs.total;
  const reasons = [];

  if (!market.liquid) reasons.push("liquidity too low");
  if (costs.spreadPct > config.maxSpreadPct) reasons.push("spread too wide");
  if (momentum.oneMinutePct <= 0 || momentum.fiveMinutePct <= 0 || momentum.fifteenMinutePct <= 0) reasons.push("momentum not positive across horizons");
  if (expectedNet < config.minNetProfitEur) reasons.push("expected net profit below minimum");

  return {
    symbol: market.symbol,
    eligible: reasons.length === 0,
    momentum,
    costs,
    expectedGross,
    expectedNet,
    rejectionReasons: reasons
  };
}

function amountEurForSignal(market, config) {
  return Math.min(config.startingCapitalEur * config.maxPositionFraction, market.maxTradableEur ?? config.startingCapitalEur * config.maxPositionFraction);
}
