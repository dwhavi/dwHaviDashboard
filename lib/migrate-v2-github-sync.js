// V2-Sync 마이그레이션 (추가만, 멱등, 기존 데이터 보존).
// 실행:  node lib/migrate-v2-github-sync.js [테이블명]
// 기본 테이블: projects_v2. 테이블명 인자는 빈 DB 검증용으로만 사용한다.
import pg from 'pg';
const { Client } = pg;

const TABLE = process.argv[2] || 'projects_v2';
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(TABLE)) {
  console.error(`테이블명 오류: ${TABLE}`);
  process.exit(1);
}

const INDEX = `${TABLE}_repo_full_name_uidx`;

const STATEMENTS = [
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS repo_full_name VARCHAR(200)`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual'`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS origin VARCHAR(10) NOT NULL DEFAULT 'own'`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS origin_note TEXT`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS maturity VARCHAR(10) NOT NULL DEFAULT 'seed'`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS maturity_auto VARCHAR(10)`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS deploy_kind VARCHAR(10)`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS topic VARCHAR(20)`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS signals JSONB NOT NULL DEFAULT '{}'`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS locked_fields TEXT[] NOT NULL DEFAULT '{}'`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS is_private_repo BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS summary_approved BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX} ON ${TABLE} (repo_full_name) WHERE repo_full_name IS NOT NULL`,
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
for (const sql of STATEMENTS) {
  await client.query(sql);
  console.log('OK:', sql.length > 90 ? sql.slice(0, 90) + '...' : sql);
}
await client.end();
console.log(`마이그레이션 완료: ${TABLE}`);
