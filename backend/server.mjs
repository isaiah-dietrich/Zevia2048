import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_ENTRIES = 5000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "leaderboard.json");

const perIpRequests = new Map();
let writeChain = Promise.resolve();

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readEntries() {
  await ensureStorage();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  let parsed = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = [];
  }
  return Array.isArray(parsed) ? parsed : [];
}

function queueWrite(entries) {
  writeChain = writeChain.then(async () => {
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entries), "utf8");
    await fs.rename(tmp, DATA_FILE);
  });
  return writeChain;
}

function sendJson(res, statusCode, payload, origin) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = perIpRequests.get(ip) || [];
  const recent = bucket.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    perIpRequests.set(ip, recent);
    return false;
  }
  recent.push(now);
  perIpRequests.set(ip, recent);
  return true;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
      if (body.length > 16_384) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        reject(new Error("Empty body"));
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sanitizeUsername(input) {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (cleaned.length < 3 || cleaned.length > 16) return null;
  if (!/^[A-Za-z0-9 _.-]+$/.test(cleaned)) return null;
  return cleaned;
}

function toInt(value) {
  if (typeof value === "number") return Math.floor(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return NaN;
}

function validateScorePayload(payload) {
  const username = sanitizeUsername(payload?.username);
  const score = toInt(payload?.score);
  const moves = toInt(payload?.moves);
  const maxTile = payload?.maxTile === undefined ? null : toInt(payload.maxTile);

  if (!username) return { ok: false, error: "Invalid username (3-16 chars)." };
  if (!Number.isInteger(score) || score < 0 || score > 10_000_000) {
    return { ok: false, error: "Invalid score." };
  }
  if (!Number.isInteger(moves) || moves < 0 || moves > 100_000) {
    return { ok: false, error: "Invalid move count." };
  }
  if (maxTile !== null && (!Number.isInteger(maxTile) || maxTile < 0 || maxTile > 20)) {
    return { ok: false, error: "Invalid maxTile." };
  }

  return {
    ok: true,
    value: {
      username,
      score,
      moves,
      maxTile
    }
  };
}

function sorted(entries) {
  return entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.createdAt - b.createdAt;
  });
}

function withRanks(entries) {
  return entries.map((entry, idx) => ({
    rank: idx + 1,
    username: entry.username,
    score: entry.score,
    moves: entry.moves,
    maxTile: entry.maxTile,
    createdAt: entry.createdAt
  }));
}

const server = createServer(async (req, res) => {
  const origin = ALLOWED_ORIGIN;
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (method === "OPTIONS") {
    sendJson(res, 204, {}, origin);
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true }, origin);
    return;
  }

  if (method === "GET" && url.pathname === "/api/leaderboard") {
    const limitParam = toInt(url.searchParams.get("limit"));
    const limit = Number.isInteger(limitParam)
      ? Math.max(1, Math.min(MAX_LIMIT, limitParam))
      : DEFAULT_LIMIT;

    const entries = sorted(await readEntries()).slice(0, limit);
    sendJson(res, 200, { entries: withRanks(entries) }, origin);
    return;
  }

  if (method === "POST" && url.pathname === "/api/leaderboard") {
    const ip = getIp(req);
    if (!checkRateLimit(ip)) {
      sendJson(res, 429, { error: "Too many requests. Try again in a minute." }, origin);
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const validation = validateScorePayload(payload);
      if (!validation.ok) {
        sendJson(res, 400, { error: validation.error }, origin);
        return;
      }

      const entries = await readEntries();
      entries.push({
        id: crypto.randomUUID(),
        ...validation.value,
        createdAt: Date.now()
      });
      const cleaned = sorted(entries).slice(0, MAX_ENTRIES);
      await queueWrite(cleaned);

      sendJson(res, 201, { ok: true }, origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bad request";
      sendJson(res, 400, { error: message }, origin);
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" }, origin);
});

ensureStorage()
  .then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Leaderboard API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize leaderboard storage:", err);
    process.exit(1);
  });
