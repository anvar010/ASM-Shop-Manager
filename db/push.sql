-- ---------------------------------------------------------------------------
-- Push subscriptions
--
-- One row per device that has agreed to receive notifications. A person with a
-- phone and a laptop has two. The endpoint is the browser's push service URL
-- and is what identifies the device, so it is the unique key.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          CHAR(36)      NOT NULL,
  user_id     CHAR(36)      NOT NULL,
  -- Long enough for any push service URL; too short truncates and breaks sends.
  endpoint    VARCHAR(500)  NOT NULL,
  p256dh      VARCHAR(255)  NOT NULL,
  auth        VARCHAR(255)  NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_push_endpoint (endpoint),
  KEY idx_push_user (user_id),
  -- Removing an account takes its devices with it.
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
