const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DB_DIR, "leaderboard.json");
const LEADERBOARD_LIMIT = 5;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function ensureDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");
}

function readScores() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.writeFileSync(DB_FILE, JSON.stringify(scores, null, 2), "utf8");
}

function maskIp(ip) {
  if (!ip) return "unknown";
  if (ip.includes(":")) return ip.replace(/:[^:]+$/, ":*");
  const parts = ip.split(".");
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.*.*`;
}

function createIpKey(ip) {
  return crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex").slice(0, 16);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const source = Array.isArray(forwarded) ? forwarded[0] : (forwarded || "");
  const candidate = source.split(",")[0].trim() || req.socket.remoteAddress || "";
  return candidate.replace(/^::ffff:/, "");
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
  });
  res.end(body);
}

function getAdminTokenFromRequest(req, url) {
  const auth = String(req.headers.authorization || "");
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerToken = String(req.headers["x-admin-token"] || "").trim();
  const queryToken = String(url.searchParams.get("token") || "").trim();
  return bearer || headerToken || queryToken;
}

function isAdminAuthorized(req, url) {
  if (!ADMIN_TOKEN) return false;
  const token = getAdminTokenFromRequest(req, url);
  return token && token === ADMIN_TOKEN;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function handleLeaderboardGet(res) {
  const bestByIp = new Map();
  for (const row of readScores()) {
    const key = row.ipKey || row.ipMasked || String(row.nickname || "").trim().toLowerCase();
    if (!key) continue;
    const prev = bestByIp.get(key);
    if (!prev || row.score > prev.score || (row.score === prev.score && row.playedAt > prev.playedAt)) {
      bestByIp.set(key, row);
    }
  }

  const scores = Array.from(bestByIp.values())
    .sort((a, b) => b.score - a.score || b.playedAt.localeCompare(a.playedAt))
    .slice(0, LEADERBOARD_LIMIT);
  sendJson(res, 200, { scores });
}

function handleAdminLeaderboardGet(req, res, url) {
  if (!isAdminAuthorized(req, url)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const scores = readScores().sort((a, b) => b.playedAt.localeCompare(a.playedAt));
  sendJson(res, 200, { scores });
}

function handleScorePost(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString("utf8");
    if (body.length > 1_000_000) req.destroy();
  });
  req.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }

    const nickname = String(payload.nickname || "").trim().slice(0, 24);
    const score = Number(payload.score);

    if (!nickname) {
      sendJson(res, 400, { error: "Nickname is required" });
      return;
    }
    if (!Number.isFinite(score) || score < 0 || score > 9999) {
      sendJson(res, 400, { error: "Invalid score" });
      return;
    }

    const rawIp = getClientIp(req);
    const item = {
      nickname,
      score: Math.floor(score),
      playedAt: new Date().toISOString(),
      ipMasked: maskIp(rawIp),
      ipKey: createIpKey(rawIp),
      ipFull: rawIp,
    };

    const scores = readScores();
    scores.push(item);
    writeScores(scores);

    sendJson(res, 201, { ok: true, item });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/leaderboard" && req.method === "GET") {
    handleLeaderboardGet(res);
    return;
  }

  if (url.pathname === "/api/admin/leaderboard-full" && req.method === "GET") {
    handleAdminLeaderboardGet(req, res, url);
    return;
  }

  if (url.pathname === "/api/score" && req.method === "POST") {
    handleScorePost(req, res);
    return;
  }

  const requested = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const safePath = path.normalize(requested);
  const filePath = path.resolve(ROOT, safePath);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, "index.html")) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  sendFile(res, filePath);
});

ensureDb();
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
