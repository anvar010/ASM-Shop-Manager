-- ---------------------------------------------------------------------------
-- Accounts
--
-- Passwords are never stored, only a scrypt hash with a per-user random salt.
-- The role decides what the app will show and what the API will answer.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id             CHAR(36)      NOT NULL,
  username       VARCHAR(60)   NOT NULL,
  display_name   VARCHAR(120)  NOT NULL,
  -- "scrypt$<salt-hex>$<hash-hex>"
  password_hash  VARCHAR(255)  NOT NULL,
  role           ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  active         TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at  TIMESTAMP     NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Usernames are the login handle, so they must be unique.
  UNIQUE KEY uniq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
