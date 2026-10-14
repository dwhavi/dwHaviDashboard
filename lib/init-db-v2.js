import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
console.log('✅ DB 연결 성공');

await client.query(`
  CREATE TABLE IF NOT EXISTS projects_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    summary TEXT,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'web',
    status VARCHAR(20) NOT NULL DEFAULT 'development',
    thumbnail TEXT,
    github_url VARCHAR(500),
    service_links JSONB DEFAULT '[]',
    tech_stack TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    plan_content TEXT,
    plan_filename VARCHAR(255),
    version VARCHAR(20),
    license VARCHAR(50),
    repo_full_name VARCHAR(200),
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    origin VARCHAR(10) NOT NULL DEFAULT 'own',
    origin_note TEXT,
    maturity VARCHAR(10) NOT NULL DEFAULT 'seed',
    maturity_auto VARCHAR(10),
    deploy_kind VARCHAR(10),
    is_test BOOLEAN NOT NULL DEFAULT false,
    topic VARCHAR(20),
    signals JSONB NOT NULL DEFAULT '{}',
    locked_fields TEXT[] NOT NULL DEFAULT '{}',
    is_private_repo BOOLEAN NOT NULL DEFAULT false,
    summary_approved BOOLEAN NOT NULL DEFAULT false,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
`);
console.log('✅ projects_v2 테이블 생성 완료');

await client.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS projects_v2_repo_full_name_uidx
    ON projects_v2 (repo_full_name) WHERE repo_full_name IS NOT NULL;
`);
console.log('✅ repo_full_name 유니크 인덱스 완료');

await client.end();
