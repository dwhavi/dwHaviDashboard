import pg from 'pg';
const { Client } = pg;

// ── V2 확정 매핑표 (camelCase ↔ snake_case 1:1 고정) ──

const CAMEL_TO_SNAKE = {
  githubUrl: 'github_url',
  serviceLinks: 'service_links',
  techStack: 'tech_stack',
  planContent: 'plan_content',
  planFilename: 'plan_filename',
  screenshot: 'thumbnail',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  repoFullName: 'repo_full_name',
  originNote: 'origin_note',
  maturityAuto: 'maturity_auto',
  deployKind: 'deploy_kind',
  isTest: 'is_test',
  lockedFields: 'locked_fields',
  isPrivateRepo: 'is_private_repo',
  summaryApproved: 'summary_approved',
  lastSyncedAt: 'last_synced_at',
};

const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k])
);

// screenshot 별칭도 허용 (구 폼 호환)
const ALIASES = { screenshot: 'thumbnail', serviceUrl: null /* 구 단일 URL은 호출부에서 변환 */ };

const VALID_COLUMNS = new Set([
  'id', 'name', 'summary', 'description', 'category', 'status',
  'thumbnail', 'github_url', 'service_links',
  'tech_stack', 'tags', 'features',
  'plan_content', 'plan_filename',
  'version', 'license',
  'repo_full_name', 'source', 'origin', 'origin_note',
  'maturity', 'maturity_auto', 'deploy_kind', 'is_test', 'topic',
  'signals', 'locked_fields', 'is_private_repo', 'summary_approved',
  'last_synced_at',
  'created_at', 'updated_at',
]);

const VALID_CATEGORIES = new Set(['web', 'mobile', 'ai', 'devops', 'tool']);
const VALID_STATUS = new Set(['active', 'development', 'archived']);
const VALID_SOURCE = new Set(['manual', 'github-sync', 'md-upload']);
const VALID_ORIGIN = new Set(['own', 'fork', 'remake']);
const VALID_MATURITY = new Set(['seed', 'building', 'shipped']);
const VALID_DEPLOY_KIND = new Set(['vercel', 'other', 'none']);
const VALID_TOPIC = new Set(['ai', 'tool', 'app', 'game', 'other']);

const LIST_COLUMNS = [
  'id', 'name', 'summary', 'category', 'status', 'thumbnail',
  'github_url', 'service_links', 'tech_stack', 'tags', 'features',
  'version', 'license', 'plan_filename', 'created_at', 'updated_at',
  'repo_full_name', 'source', 'origin', 'origin_note',
  'maturity', 'maturity_auto', 'deploy_kind', 'is_test', 'topic',
  'signals', 'locked_fields', 'is_private_repo', 'summary_approved',
  'last_synced_at',
].join(', ');

// ── 공개 직렬화 (모든 공개 경로의 단일 출구) ──
// 비공개 레포(is_private_repo=true)는 허용 키만 반환.
// summary는 관리자가 승인(summary_approved=true)한 경우에만 공개.
// 그 외 금지: github_url, repo_full_name, plan_content, thumbnail,
// signals 상세, description 원문 등.
const PUBLIC_PRIVATE_KEYS = [
  'id', 'name', 'summary', 'maturity', 'topic', 'tags',
  'origin', 'deployKind', 'lastActivity',
];

export function serializePublic(row) {
  const p = toProject(row && row.id !== undefined ? row : {});
  if (!p.isPrivateRepo) return p;
  const full = {
    id: p.id,
    name: p.name,
    summary: p.summaryApproved ? p.summary ?? null : null,
    maturity: p.maturity,
    topic: p.topic ?? null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    origin: p.origin,
    deployKind: p.deployKind ?? null,
    lastActivity: p.lastSyncedAt || p.updatedAt || null,
  };
  // 허용 키 이외의 누출 방지 (키 추가 시 화이트리스트 경유 강제)
  const out = {};
  for (const k of PUBLIC_PRIVATE_KEYS) out[k] = full[k];
  return out;
}

export function serializePublicList(rows) {
  return (rows || []).map((r) => serializePublic(r));
}

function toRow(obj) {
  const row = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'serviceUrl' && value) {
      // 구 단일 URL → service_links 승격
      row.service_links = [{ label: 'Live', url: String(value) }];
      continue;
    }
    const col = CAMEL_TO_SNAKE[key] || ALIASES[key] || key;
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
  // service_links null 가드
  if (!Array.isArray(project.serviceLinks)) project.serviceLinks = [];
  return project;
}

function sanitize(row) {
  const out = {};
  for (const [col, val] of Object.entries(row)) {
    if (VALID_COLUMNS.has(col)) out[col] = val;
  }
  if (out.category && !VALID_CATEGORIES.has(out.category)) delete out.category;
  if (out.status && !VALID_STATUS.has(out.status)) delete out.status;
  if (out.source && !VALID_SOURCE.has(out.source)) delete out.source;
  if (out.origin && !VALID_ORIGIN.has(out.origin)) delete out.origin;
  if (out.maturity && !VALID_MATURITY.has(out.maturity)) delete out.maturity;
  if (out.maturity_auto && !VALID_MATURITY.has(out.maturity_auto)) delete out.maturity_auto;
  if (out.deploy_kind && !VALID_DEPLOY_KIND.has(out.deploy_kind)) delete out.deploy_kind;
  if (out.topic && !VALID_TOPIC.has(out.topic)) delete out.topic;
  // signals 정규화 (객체만 허용)
  if (out.signals != null && (typeof out.signals !== 'object' || Array.isArray(out.signals))) {
    delete out.signals;
  }
  // locked_fields 정규화 (문자열 배열만 허용)
  if (out.locked_fields != null && (!Array.isArray(out.locked_fields) || !out.locked_fields.every((f) => typeof f === 'string'))) {
    delete out.locked_fields;
  }
  // service_links 정규화
  if (out.service_links != null && !Array.isArray(out.service_links)) {
    delete out.service_links;
  }
  return out;
}

async function getClient() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

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
    // 목록에서는 plan_content 제외 (성능)
    const sql = `SELECT ${LIST_COLUMNS} FROM projects_v2 ${where} ORDER BY created_at DESC`;
    const { rows } = await client.query(sql, params);
    return rows.map(toProject);
  } finally {
    await client.end();
  }
}

export async function getById(id) {
  const client = await getClient();
  try {
    const { rows } = await client.query('SELECT * FROM projects_v2 WHERE id = $1', [id]);
    return rows.length > 0 ? toProject(rows[0]) : null;
  } finally {
    await client.end();
  }
}

export async function findByRepoFullName(repoFullName) {
  const client = await getClient();
  try {
    const { rows } = await client.query('SELECT * FROM projects_v2 WHERE repo_full_name = $1', [repoFullName]);
    return rows.length > 0 ? toProject(rows[0]) : null;
  } finally {
    await client.end();
  }
}

export async function findAllWithRepo() {
  const client = await getClient();
  try {
    const { rows } = await client.query('SELECT * FROM projects_v2 WHERE repo_full_name IS NOT NULL');
    return rows.map(toProject);
  } finally {
    await client.end();
  }
}

function encodeValue(col, val) {
  if (val == null) return null;
  // service_links/signals(JSONB)만 직렬화. TEXT[]는 pg 드라이버가 JS 배열 그대로 처리.
  if (col === 'service_links' || col === 'signals') return JSON.stringify(val);
  return val;
}

export async function create(data) {
  const client = await getClient();
  try {
    const row = sanitize(toRow(data));

    const columns = Object.keys(row).filter((c) => !(c === 'id' && row.id == null));
    const values = columns.map((c) => encodeValue(c, row[c]));
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const sql = `INSERT INTO projects_v2 (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const { rows } = await client.query(sql, values);
    return toProject(rows[0]);
  } finally {
    await client.end();
  }
}

export async function update(id, data) {
  const client = await getClient();
  try {
    const row = sanitize(toRow(data));
    delete row.id;
    delete row.created_at;

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [col, val] of Object.entries(row)) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(encodeValue(col, val));
    }
    if (setClauses.length === 0) return getById(id);

    values.push(id);
    const sql = `UPDATE projects_v2 SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await client.query(sql, values);
    return rows.length > 0 ? toProject(rows[0]) : null;
  } finally {
    await client.end();
  }
}

export async function deleteById(id) {
  const client = await getClient();
  try {
    const { rows } = await client.query('DELETE FROM projects_v2 WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  } finally {
    await client.end();
  }
}
