import pg from 'pg';
const { Client } = pg;

// ── camelCase ↔ snake_case 변환 유틸리티 ──

const CAMEL_TO_SNAKE = {
  techStack: 'tech_stack',
  githubUrl: 'github_url',
  liveUrl: 'live_url',
  startDate: 'start_date',
  readmeContent: 'readme_content',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k])
);

function toRow(obj) {
  const row = {};
  for (const [key, value] of Object.entries(obj)) {
    const col = CAMEL_TO_SNAKE[key] || key;
    row[col] = value;
  }
  return row;
}

function toProject(row) {
  const project = {};
  for (const [col, value] of Object.entries(row)) {
    const key = SNAKE_TO_CAMEL[col] || col;
    project[key] = value;
  }
  return project;
}

// ── DB 커넥션 헬퍼 (Neon 서버리스: 매 요청마다 새 커넥션) ──

async function getClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

// ── CRUD 함수 ──

export async function getAll({ category, status, q } = {}) {
  const client = await getClient();
  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (q) {
      const keyword = `%${q}%`;
      conditions.push(
        `(name ILIKE $${idx} OR summary ILIKE $${idx} OR ` +
        `EXISTS (SELECT 1 FROM unnest(tech_stack) t WHERE t ILIKE $${idx}) OR ` +
        `EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE $${idx}))`
      );
      idx++;
      params.push(keyword);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `SELECT * FROM projects ${where} ORDER BY created_at DESC`;
    const { rows } = await client.query(sql, params);
    return rows.map(toProject);
  } finally {
    await client.end();
  }
}

export async function getById(id) {
  const client = await getClient();
  try {
    const { rows } = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
    return rows.length > 0 ? toProject(rows[0]) : null;
  } finally {
    await client.end();
  }
}

export async function create(data) {
  const client = await getClient();
  try {
    const now = new Date().toISOString().split('T')[0];
    const row = toRow(data);
    row.created_at = now;
    row.updated_at = now;

    const columns = Object.keys(row);
    const values = Object.values(row);

    // id가 명시적으로 전달된 경우만 포함, 아니면 DB에서 자동 생성 (생략)
    const filteredColumns = columns.filter(c => c !== 'id' || row.id != null);
    const filteredValues = filteredColumns.map(c => row[c]);
    const placeholders = filteredColumns.map((_, i) => `$${i + 1}`);

    const sql = `INSERT INTO projects (${filteredColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const { rows } = await client.query(sql, filteredValues);
    return toProject(rows[0]);
  } finally {
    await client.end();
  }
}

export async function update(id, data) {
  const client = await getClient();
  try {
    const now = new Date().toISOString().split('T')[0];
    const row = toRow(data);
    row.updated_at = now;

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [col, val] of Object.entries(row)) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(val);
    }

    values.push(id);
    const sql = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await client.query(sql, values);
    return rows.length > 0 ? toProject(rows[0]) : null;
  } finally {
    await client.end();
  }
}

export async function deleteById(id) {
  const client = await getClient();
  try {
    const { rows } = await client.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  } finally {
    await client.end();
  }
}
