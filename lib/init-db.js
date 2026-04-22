import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
console.log('✅ DB 연결 성공');

await client.query(`
  CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    summary TEXT,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'web',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    thumbnail TEXT,
    github_url VARCHAR(500),
    live_url VARCHAR(500),
    tech_stack TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    goals TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    architecture TEXT,
    start_date VARCHAR(20),
    version VARCHAR(20),
    license VARCHAR(50),
    readme_content TEXT,
    featured BOOLEAN DEFAULT false,
    created_at VARCHAR(20) NOT NULL,
    updated_at VARCHAR(20) NOT NULL
  );
`);
console.log('✅ projects 테이블 생성 완료');

await client.end();
