const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION";

if (JWT_SECRET === "CHANGE_ME_IN_PRODUCTION") {
  console.warn("WARNING: Set JWT_SECRET in your environment before production.");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/", apiLimiter);

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "keyserver.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  key_name TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'active',
  allow_free_login INTEGER DEFAULT 0,
  get_real_uid_ios INTEGER DEFAULT 0,
  contact_link TEXT DEFAULT '',
  update_link TEXT DEFAULT '',
  notify_message TEXT DEFAULT '',
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS keys (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value_hash TEXT NOT NULL,
  value_prefix TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  uid TEXT,
  banned INTEGER DEFAULT 0,
  note TEXT DEFAULT '',
  FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_id TEXT NOT NULL,
  text TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  FOREIGN KEY(key_id) REFERENCES keys(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS banned_devices (
  uid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_keys_package ON keys(package_id);
CREATE INDEX IF NOT EXISTS idx_keys_prefix ON keys(value_prefix);
CREATE INDEX IF NOT EXISTS idx_messages_key ON messages(key_id);
`);

function now() { return Date.now(); }
function id() { return crypto.randomBytes(8).toString("hex"); }
function randomSecret(prefix, bytes = 18) {
  return `${prefix}_${crypto.randomBytes(bytes).toString("base64url")}`;
}
function sha256(v) {
  return crypto.createHash("sha256").update(v).digest("hex");
}
function hashSecret(v) {
  return sha256(v);
}
function verifySecret(v, hash) {
  const a = Buffer.from(hashSecret(v), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function signToken(admin) {
  return jwt.sign({ sub: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: "12h" });
}
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
function requireText(v, max = 500) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function makeKey() {
  const r = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PK-${r()}-${r()}-${r()}`;
}
function publicPackage(p) {
  return {
    id: p.id, name: p.name, description: p.description, keyName: p.key_name,
    version: p.version, status: p.status,
    allowFreeLogin: !!p.allow_free_login, getRealUidIOS: !!p.get_real_uid_ios,
    contactLink: p.contact_link, updateLink: p.update_link,
    notifyMessage: p.notify_message, apiKeyPrefix: p.api_key_prefix,
    token: p.token, createdAt: p.created_at
  };
}
function publicKey(k, includeValue = false) {
  const out = {
    id: k.id, packageId: k.package_id, name: k.name,
    keyPrefix: k.value_prefix, maxUses: k.max_uses, usedCount: k.used_count,
    createdAt: k.created_at, expiresAt: k.expires_at,
    uid: k.uid, banned: !!k.banned, note: k.note
  };
  if (includeValue) out.value = null;
  return out;
}

// First-run admin.
const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASSWORD || "admin123";
const existing = db.prepare("SELECT id FROM admins WHERE username=?").get(adminUser);
if (!existing) {
  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare("INSERT INTO admins(username,password_hash,created_at) VALUES(?,?,?)")
    .run(adminUser, hash, now());
  console.log(`Created admin: ${adminUser}`);
  if (!process.env.ADMIN_PASSWORD) console.warn("Change the default admin password before production.");
}

// ---------- Admin auth ----------
app.post("/api/auth/login", (req, res) => {
  const username = requireText(req.body.username, 100);
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const admin = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  }
  res.json({ token: signToken(admin), user: { id: admin.id, username: admin.username } });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ user: { id: req.admin.sub, username: req.admin.username } });
});

// ---------- Dashboard ----------
app.get("/api/dashboard", auth, (req, res) => {
  const packages = db.prepare("SELECT COUNT(*) c FROM packages").get().c;
  const keys = db.prepare("SELECT COUNT(*) c FROM keys").get().c;
  const bannedKeys = db.prepare("SELECT COUNT(*) c FROM keys WHERE banned=1").get().c;
  const bannedDevices = db.prepare("SELECT COUNT(*) c FROM banned_devices").get().c;
  res.json({ packages, keys, bannedKeys, bannedDevices });
});

// ---------- Packages ----------
app.get("/api/packages", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM packages ORDER BY created_at DESC").all();
  res.json(rows.map(publicPackage));
});

app.post("/api/packages", auth, (req, res) => {
  const b = req.body || {};
  const name = requireText(b.name, 120);
  if (!name) return res.status(400).json({ error: "PACKAGE_NAME_REQUIRED" });

  const apiKey = randomSecret("pk");
  const token = randomSecret("tok");
  const pkg = {
    id: id(), name, description: requireText(b.description, 500),
    key_name: requireText(b.keyName, 100), version: requireText(b.version, 50) || "1.0.0",
    status: b.status === "maintenance" ? "maintenance" : "active",
    allow_free_login: b.allowFreeLogin ? 1 : 0,
    get_real_uid_ios: b.getRealUidIOS ? 1 : 0,
    contact_link: requireText(b.contactLink, 500),
    update_link: requireText(b.updateLink, 500),
    notify_message: requireText(b.notifyMessage, 1000),
    api_key_hash: hashSecret(apiKey),
    api_key_prefix: apiKey.slice(0, 14),
    token, created_at: now()
  };
  db.prepare(`INSERT INTO packages
    (id,name,description,key_name,version,status,allow_free_login,get_real_uid_ios,contact_link,update_link,notify_message,api_key_hash,api_key_prefix,token,created_at)
    VALUES(@id,@name,@description,@key_name,@version,@status,@allow_free_login,@get_real_uid_ios,@contact_link,@update_link,@notify_message,@api_key_hash,@api_key_prefix,@token,@created_at)`).run(pkg);
  res.status(201).json({ package: publicPackage(pkg), apiKey });
});

app.put("/api/packages/:id", auth, (req, res) => {
  const b = req.body || {};
  const old = db.prepare("SELECT * FROM packages WHERE id=?").get(req.params.id);
  if (!old) return res.status(404).json({ error: "PACKAGE_NOT_FOUND" });

  db.prepare(`UPDATE packages SET name=?,description=?,key_name=?,version=?,status=?,
    allow_free_login=?,get_real_uid_ios=?,contact_link=?,update_link=?,notify_message=? WHERE id=?`)
    .run(
      requireText(b.name,120) || old.name, requireText(b.description,500),
      requireText(b.keyName,100), requireText(b.version,50) || "1.0.0",
      b.status === "maintenance" ? "maintenance" : "active",
      b.allowFreeLogin ? 1 : 0, b.getRealUidIOS ? 1 : 0,
      requireText(b.contactLink,500), requireText(b.updateLink,500),
      requireText(b.notifyMessage,1000), req.params.id
    );
  res.json({ package: publicPackage(db.prepare("SELECT * FROM packages WHERE id=?").get(req.params.id)) });
});

app.delete("/api/packages/:id", auth, (req, res) => {
  const r = db.prepare("DELETE FROM packages WHERE id=?").run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: "PACKAGE_NOT_FOUND" });
  res.json({ ok: true });
});

// ---------- Keys ----------
const durations = {
  "1d": 86400000, "3d": 259200000, "7d": 604800000,
  "1th": 2592000000, "3th": 7776000000, "1nam": 31536000000
};

app.get("/api/keys", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM keys ORDER BY created_at DESC").all();
  res.json(rows.map(k => publicKey(k)));
});

app.post("/api/keys", auth, (req, res) => {
  const b = req.body || {};
  const packageId = requireText(b.packageId, 100);
  const pkg = db.prepare("SELECT id FROM packages WHERE id=?").get(packageId);
  if (!pkg) return res.status(400).json({ error: "PACKAGE_NOT_FOUND" });

  const duration = durations[b.duration] || durations["7d"];
  const value = makeKey();
  const key = {
    id: id(), package_id: packageId, name: requireText(b.name, 100) || `KEY-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
    value_hash: hashSecret(value), value_prefix: value.slice(0, 12),
    max_uses: Math.max(1, Math.min(100000, Number(b.maxUses) || 1)),
    used_count: 0, created_at: now(), expires_at: now() + duration,
    uid: null, banned: 0, note: ""
  };
  db.prepare(`INSERT INTO keys
    (id,package_id,name,value_hash,value_prefix,max_uses,used_count,created_at,expires_at,uid,banned,note)
    VALUES(@id,@package_id,@name,@value_hash,@value_prefix,@max_uses,@used_count,@created_at,@expires_at,@uid,@banned,@note)`).run(key);
  res.status(201).json({ key: { ...publicKey(key), value } });
});

app.put("/api/keys/:id", auth, (req, res) => {
  const k = db.prepare("SELECT * FROM keys WHERE id=?").get(req.params.id);
  if (!k) return res.status(404).json({ error: "KEY_NOT_FOUND" });
  const b = req.body || {};
  db.prepare("UPDATE keys SET banned=?,note=? WHERE id=?")
    .run(b.banned ? 1 : 0, requireText(b.note,1000), req.params.id);
  res.json({ key: publicKey(db.prepare("SELECT * FROM keys WHERE id=?").get(req.params.id)) });
});

app.delete("/api/keys/:id", auth, (req, res) => {
  const r = db.prepare("DELETE FROM keys WHERE id=?").run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: "KEY_NOT_FOUND" });
  res.json({ ok: true });
});

app.post("/api/keys/:id/reset", auth, (req, res) => {
  const r = db.prepare("UPDATE keys SET used_count=0,uid=NULL,banned=0 WHERE id=?").run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: "KEY_NOT_FOUND" });
  res.json({ ok: true });
});

// ---------- Device bans ----------
app.get("/api/banned-devices", auth, (req, res) => {
  res.json(db.prepare("SELECT uid,created_at createdAt FROM banned_devices ORDER BY created_at DESC").all());
});
app.post("/api/banned-devices", auth, (req, res) => {
  const uid = requireText(req.body?.uid, 255);
  if (!uid) return res.status(400).json({ error: "UID_REQUIRED" });
  try {
    db.prepare("INSERT INTO banned_devices(uid,created_at) VALUES(?,?)").run(uid, now());
  } catch {
    return res.status(409).json({ error: "UID_ALREADY_BANNED" });
  }
  res.status(201).json({ uid });
});
app.delete("/api/banned-devices/:uid", auth, (req, res) => {
  const r = db.prepare("DELETE FROM banned_devices WHERE uid=?").run(req.params.uid);
  if (!r.changes) return res.status(404).json({ error: "UID_NOT_FOUND" });
  res.json({ ok: true });
});

// ---------- Public key verification for tweak ----------
app.post("/v1/verify", (req, res) => {
  const apiKey = requireText(req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "", 300);
  const keyValue = requireText(req.body?.key, 200);
  const uid = requireText(req.body?.uid, 255);

  if (!apiKey || !keyValue) return res.status(400).json({ valid: false, error: "API_KEY_AND_KEY_REQUIRED" });

  const packages = db.prepare("SELECT * FROM packages").all();
  const pkg = packages.find(p => verifySecret(apiKey, p.api_key_hash));
  if (!pkg) return res.status(401).json({ valid: false, error: "INVALID_API_KEY" });

  if (pkg.status !== "active") {
    return res.status(423).json({ valid: false, error: "PACKAGE_MAINTENANCE" });
  }

  if (uid && db.prepare("SELECT uid FROM banned_devices WHERE uid=?").get(uid)) {
    return res.status(403).json({ valid: false, error: "DEVICE_BANNED" });
  }

  const candidates = db.prepare("SELECT * FROM keys WHERE package_id=?").all(pkg.id);
  const k = candidates.find(x => verifySecret(keyValue, x.value_hash));
  if (!k) return res.status(403).json({ valid: false, error: "INVALID_KEY" });
  if (k.banned) return res.status(403).json({ valid: false, error: "KEY_BANNED" });
  if (k.expires_at <= now()) return res.status(403).json({ valid: false, error: "KEY_EXPIRED" });
  if (k.used_count >= k.max_uses) return res.status(403).json({ valid: false, error: "KEY_USAGE_LIMIT" });

  if (pkg.get_real_uid_ios && !uid) {
    return res.status(400).json({ valid: false, error: "UID_REQUIRED" });
  }

  db.prepare("UPDATE keys SET used_count=used_count+1,uid=COALESCE(?,uid) WHERE id=?").run(uid || null, k.id);

  const messages = db.prepare("SELECT text,sent_at sentAt FROM messages WHERE key_id=? ORDER BY sent_at DESC").all(k.id);
  res.json({
    valid: true,
    package: {
      id: pkg.id, name: pkg.name, version: pkg.version,
      notifyMessage: pkg.notify_message, updateLink: pkg.update_link,
      contactLink: pkg.contact_link
    },
    key: {
      id: k.id, expiresAt: k.expires_at,
      usedCount: k.used_count + 1, maxUses: k.max_uses,
      messages
    }
  });
});

// Admin message endpoint.
app.post("/api/keys/:id/messages", auth, (req, res) => {
  const text = requireText(req.body?.text, 1000);
  if (!text) return res.status(400).json({ error: "MESSAGE_REQUIRED" });
  const exists = db.prepare("SELECT id FROM keys WHERE id=?").get(req.params.id);
  if (!exists) return res.status(404).json({ error: "KEY_NOT_FOUND" });
  db.prepare("INSERT INTO messages(key_id,text,sent_at) VALUES(?,?,?)").run(req.params.id, text, now());
  res.status(201).json({ ok: true });
});

app.get("/health", (req, res) => res.json({ ok: true, service: "tweak-key-server", time: now() }));

// Serve the dashboard. SPA fallback keeps / routes from showing blank.
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/v1/")) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Key server running on http://localhost:${PORT}`));
