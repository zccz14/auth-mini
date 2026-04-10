PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_otps (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('email_otp', 'webauthn')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jwks_keys (
  id TEXT PRIMARY KEY CHECK (id IN ('CURRENT', 'STANDBY')),
  kid TEXT NOT NULL UNIQUE,
  alg TEXT NOT NULL,
  public_jwk TEXT NOT NULL,
  private_jwk TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smtp_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT '',
  secure INTEGER NOT NULL DEFAULT 0 CHECK (secure IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0)
);

CREATE TABLE IF NOT EXISTS allowed_origins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '',
  rp_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  request_id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('register', 'authenticate')),
  challenge TEXT NOT NULL,
  user_id TEXT,
  expires_at TEXT NOT NULL,
  rp_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (type = 'register' AND user_id IS NOT NULL) OR
    (type = 'authenticate' AND user_id IS NULL)
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
