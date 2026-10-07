# Crypto Paper-Trading Bot

This module is **PAPER ONLY**. It has no exchange trading client, no API-key support, no withdrawal capability, and no order-sending implementation.

## Architecture

- `src/market-data.js` market-data interface and safe simulated provider
- `src/strategy.js` liquidity/cost/momentum signal logic
- `src/paper-execution.js` simulation-only fills
- `src/portfolio.js` virtual EUR portfolio
- `src/backtest.js` historical-data backtest runner
- `src/cli.js` console output

## Safety invariant

`PAPER_ONLY` is the only execution mode. The execution layer contains no exchange/HTTP order endpoint and rejects any non-paper mode.

## Run

`cd paper-trading && npm test`

`cd paper-trading && npm start`

`cd paper-trading && npm run backtest -- ./data/example.json`
