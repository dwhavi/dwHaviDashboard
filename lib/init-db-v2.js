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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
`);
console.log('✅ projects_v2 테이블 생성 완료');

await client.end();
