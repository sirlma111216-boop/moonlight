-- 달의 비밀 — D1 초기 스키마 (원문 13절 도메인)
-- 개인 식별 정보는 reports.identity_json 에만, 보고서 작성 단계에서만 저장된다.

CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('3', '2')),
  region TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 30,
  teacher_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  archived_at TEXT,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_class_teacher ON class_sessions(teacher_id);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  recovery_key_hash TEXT,
  recovery_attempts INTEGER NOT NULL DEFAULT 0,
  recovery_locked_until TEXT
);
CREATE INDEX IF NOT EXISTS idx_participants_class ON participants(class_id);

CREATE TABLE IF NOT EXISTS student_sessions (
  token_hash TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_student_sessions_participant ON student_sessions(participant_id);

CREATE TABLE IF NOT EXISTS teacher_sessions (
  token_hash TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('visited', 'answered', 'completed')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (participant_id, step_id, scene_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  first_json TEXT NOT NULL,
  latest_json TEXT NOT NULL,
  hints_used INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (participant_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_responses_participant ON responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('my-observation', 'provided-observation')),
  media_asset_id TEXT,
  date TEXT NOT NULL,
  time TEXT,
  time_known INTEGER NOT NULL DEFAULT 0,
  region TEXT NOT NULL,
  drawing_data_url TEXT,
  bright_description TEXT NOT NULL DEFAULT '',
  direction TEXT,
  weather TEXT,
  confidence TEXT NOT NULL DEFAULT 'mid',
  photo_key TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observations_participant ON observations(participant_id);

CREATE TABLE IF NOT EXISTS public_data_snapshots (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  request_json TEXT NOT NULL,
  base_time TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  normalized_json TEXT NOT NULL,
  is_cached INTEGER NOT NULL DEFAULT 0,
  is_example INTEGER NOT NULL DEFAULT 0,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_participant ON public_data_snapshots(participant_id);

CREATE TABLE IF NOT EXISTS model_attempts (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  target_source TEXT NOT NULL,
  target_json TEXT NOT NULL,
  state_json TEXT NOT NULL,
  submitted INTEGER NOT NULL DEFAULT 0,
  result_json TEXT,
  hints_used INTEGER NOT NULL DEFAULT 0,
  is_sandbox INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_participant ON model_attempts(participant_id);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  identity_json TEXT NOT NULL DEFAULT '{}',
  sections_json TEXT NOT NULL DEFAULT '[]',
  attach_sandbox INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS badges (
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  awarded_at TEXT NOT NULL,
  PRIMARY KEY (participant_id, badge_id)
);

CREATE TABLE IF NOT EXISTS observation_challenges (
  participant_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  candidate_date TEXT NOT NULL,
  prediction_drawing_data_url TEXT,
  prediction_note TEXT NOT NULL DEFAULT '',
  observed TEXT,
  followup_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES class_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('real', 'composite', 'simulation')),
  category TEXT NOT NULL DEFAULT 'phase',
  title TEXT NOT NULL,
  photographer TEXT NOT NULL,
  source_url TEXT,
  taken_at TEXT,
  taken_tz TEXT,
  taken_unknown INTEGER NOT NULL DEFAULT 0,
  region TEXT,
  processing TEXT,
  license TEXT NOT NULL,
  credit TEXT NOT NULL,
  alt TEXT NOT NULL,
  use_steps_json TEXT NOT NULL DEFAULT '[]',
  src TEXT,
  r2_key TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_class ON media_assets(class_id);

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  value_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_cache_provider ON api_cache(provider);

CREATE TABLE IF NOT EXISTS api_checks (
  provider TEXT PRIMARY KEY,
  ok INTEGER NOT NULL,
  checked_at TEXT NOT NULL,
  message TEXT NOT NULL,
  sample_json TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
