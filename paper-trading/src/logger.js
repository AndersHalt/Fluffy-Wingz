import fs from "node:fs/promises";
import path from "node:path";

export class TradeLogger {
  constructor(file = path.resolve("data/paper-trades.jsonl")) {
    this.file = file;
  }

  async append(event) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.appendFile(this.file, JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + "\n", "utf8");
  }
}
