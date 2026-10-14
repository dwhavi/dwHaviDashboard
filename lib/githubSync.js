/**
 * githubSync.js — GitHub 레포 수집 → signals 계산 → 성숙도 판정 → DB 반영.
 * - DB 접근은 lib/store-v2.js 경유. 이 모듈에서 직접 SQL을 쓰지 않는다.
 * - 토큰은 인자로만 받는다 (process.env 직접 읽기 금지 — 호출부가 주입).
 * - 회사 소스 보호: README/packageinfo.md/메타데이터 외 파일 본문은 읽지 않는다.
 *   로그에 파일 내용을 남기지 않는다. 비공개 레포 README는 요약 초안 생성에만
 *   쓰고 저장하지 않는다.
 * - 지시서 기본값: sigco3111 계정은 origin='remake' 자동 지정.
 */

const API = 'https://api.github.com';
const UA = 'dwHaviDashboard-sync/1.0';

import { readFileSync } from 'node:fs';

// 비공개 요약 게이트: 내부 정보로 의심되는 패턴이면 초안을 비운다.
const SENSITIVE_PATTERNS = [
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,          // IP
  /\.local\b/i,                            // 내부 도메인
  /\.internal\b/i,
  /\b[A-Z]{2,}(?:\s+[A-Z]{2,}){2,}\b/,    // 대문자 약어 나열
  /\b(?:table|schema|column)\s*[:=]\s*\w+/i, // DB·테이블명
];

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': UA,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghFetch(token, path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: headers(token) });
  const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? '60');
  if (res.status === 403 && remaining <= 1) {
    const err = new Error('GitHub rate limit 소진 — 다음 실행에서 이어간다');
    err.code = 'RATE_LIMIT';
    err.resetAt = res.headers.get('x-ratelimit-reset');
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status}: ${path}`);
    err.code = `HTTP_${res.status}`;
    throw err;
  }
  return res;
}

// 페이지네이션 전체 수집
export async function listAllRepos(token, user) {
  const repos = [];
  let page = 1;
  for (;;) {
    const q = user === '@me'
      ? `/user/repos?affiliation=owner&per_page=100&page=${page}`
      : `/users/${user}/repos?per_page=100&page=${page}`;
    const res = await ghFetch(token, q);
    const batch = await res.json();
    repos.push(...batch);
    const link = res.headers.get('link') || '';
    if (!link.includes('rel="next"')) break;
    page += 1;
    if (page > 10) break; // 안전 상한 1000개
  }
  return repos;
}

// Link 헤더 last page로 커밋 수 추정 (per_page=1 한 번 호출)
export async function countCommits(token, fullName, branch) {
  const ref = branch ? `?sha=${encodeURIComponent(branch)}&per_page=1` : '?per_page=1';
  const res = await ghFetch(token, `/repos/${fullName}/commits${ref}`);
  const link = res.headers.get('link') || '';
  const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (m) return Number(m[1]);
  const batch = await res.json();
  return Array.isArray(batch) ? batch.length : 0;
}

// 포크의 내 커밋 수: parent와 비교 (compare API ahead_by)
// 목록 API에는 parent가 없으므로 단건 조회로 보완한다.
export async function countForkOwnCommits(token, repo) {
  if (!repo.fork) return null;
  let parentFull = repo.parent?.full_name || null;
  let parentBranch = repo.parent?.default_branch || null;
  if (!parentFull) {
    try {
      const single = await ghFetch(token, `/repos/${repo.full_name}`);
      const detail = await single.json();
      parentFull = detail.parent?.full_name || null;
      parentBranch = detail.parent?.default_branch || null;
    } catch { return null; }
  }
  if (!parentFull) return null;
  try {
    const base = parentBranch || 'main';
    const headOwner = repo.owner.login;
    const headBranch = repo.default_branch || 'main';
    const res = await ghFetch(
      token,
      `/repos/${parentFull}/compare/${encodeURIComponent(base)}...${encodeURIComponent(headOwner + ':' + headBranch)}`
    );
    const data = await res.json();
    return typeof data.ahead_by === 'number' ? data.ahead_by : null;
  } catch {
    return null; // 비교 불가면 null (판정에서 보수적으로 처리)
  }
}

async function fetchText(token, fullName, path) {
  try {
    const res = await ghFetch(token, `/repos/${fullName}/contents/${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.type !== 'file' || !data.content) return null;
    return Buffer.from(data.content, 'base64').toString('utf8').slice(0, 20000);
  } catch {
    return null;
  }
}

// README 첫 단락 2문장 이내로 정리
function summarizeReadme(readme) {
  if (!readme) return '';
  const text = readme
    .replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '') // frontmatter 제거
    .replace(/```[\s\S]*?```/g, ' ')                     // 코드블록 제거
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ')              // 링크/이미지 제거
    .replace(/[#>*`_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = text.match(/[^.!?\n]+[.!?]+["']?/g) || [text];
  return sentences.slice(0, 2).join(' ').trim().slice(0, 300);
}

function looksSensitive(text) {
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}

// packageinfo.md frontmatter(summary/description 우선) → 초안
async function summaryFromPackageinfo(token, fullName, parsePlanMarkdown) {
  const md = await fetchText(token, fullName, 'packageinfo.md');
  if (!md) return { summary: '', usedPackageinfo: false };
  try {
    const parsed = parsePlanMarkdown(md, 'packageinfo.md', fullName.split('/')[1]);
    return { summary: (parsed.summary || '').slice(0, 300), usedPackageinfo: true };
  } catch {
    return { summary: '', usedPackageinfo: false };
  }
}

export function isTestName(name) {
  return new RegExp(loadMaturityConfig().testNamePattern, 'i').test(name);
}

let _maturityCfg = null;
function loadMaturityConfig() {
  if (_maturityCfg) return _maturityCfg;
  try {
    _maturityCfg = JSON.parse(readFileSync(new URL('../config/maturity.json', import.meta.url), 'utf8'));
  } catch { _maturityCfg = null; }
  _maturityCfg = _maturityCfg || { seed: { maxCommits: 5, maxFiles: 3 }, testNamePattern: 'test|tmp|demo|sandbox', readmeTemplateMinLength: 200 };
  return _maturityCfg;
}

// 테스트 전용: 설정 주입
export function __setMaturityConfig(cfg) {
  _maturityCfg = cfg;
}

/**
 * 성숙도 판정 (순수 함수 — 단위 테스트 대상).
 * @returns {{ maturityAuto, isTestSuggest, refFork: boolean }}
 */
export function decideMaturity(sig, cfg = { seed: { maxCommits: 5, maxFiles: 3 }, testNamePattern: 'test|tmp|demo|sandbox', readmeTemplateMinLength: 200 }) {
  const { commits = 0, fileCount = 0, hasReadme = false, hasDeployLink = false, ownCommits = null, isFork = false, isRemake = false, readmeTemplate = false } = sig;
  const isTestSuggest = new RegExp(cfg.testNamePattern, 'i').test(sig.name || '');

  // 포크 + 내 커밋 0 → Seed + 참고용
  if (isFork && !isRemake && (ownCommits ?? 0) === 0) {
    return { maturityAuto: 'seed', isTestSuggest, refFork: true };
  }

  // Shipped: 배포 링크 + Building 조건 충족
  const buildingBase = commits > cfg.seed.maxCommits && hasReadme && !readmeTemplate;
  const remakeBuilding = isRemake && (ownCommits ?? commits) > 0 && hasReadme;
  if (hasDeployLink && (buildingBase || remakeBuilding || isRemake)) {
    return { maturityAuto: 'shipped', isTestSuggest, refFork: false };
  }

  // Seed 조건
  if (commits <= cfg.seed.maxCommits || fileCount <= cfg.seed.maxFiles || !hasReadme || readmeTemplate) {
    return { maturityAuto: 'seed', isTestSuggest, refFork: false };
  }

  // Building: 커밋>5 + README + 배포 없음. 포크/리메이크는 내 커밋 있을 때
  if (isFork || isRemake) {
    if ((ownCommits ?? commits) > 0) return { maturityAuto: 'building', isTestSuggest, refFork: false };
    return { maturityAuto: 'seed', isTestSuggest, refFork: true };
  }
  return { maturityAuto: 'building', isTestSuggest, refFork: false };
}

function guessTopic(repo, fileCount) {
  const text = `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();
  if (/game|게임|unity|rpg|tetris|minesweeper|battleship|2048|simulator|tycoon/.test(text)) return 'game';
  if (/ai|gpt|llm|agent|openai|nim|harness|Muse|chatbot|meal/.test(text)) return 'ai';
  if (/tool|editor|converter|monitor|analyzer|dashboard|cron|cli|parser|schema/.test(text)) return 'tool';
  if (/app|budget|trading|stock|planner|resume|home|board/.test(text)) return 'app';
  void fileCount;
  return 'other';
}

function detectDeployKind(repo, liveHint = []) {
  const urls = [
    ...liveHint.map((l) => l?.url),
    repo.homepage,
    ...(Array.isArray(repo.serviceLinks) ? repo.serviceLinks.map((l) => l?.url) : []),
  ].filter(Boolean);
  if (urls.some((u) => /vercel\.app|vercel\.com/.test(u))) return { deployKind: 'vercel', hasDeployLink: true };
  if (urls.length > 0) return { deployKind: 'other', hasDeployLink: true };
  return { deployKind: 'none', hasDeployLink: false };
}

// 레포 1건 → signals + 초안 (DB 쓰기 없음, 순수 수집)
export async function collectRepo(token, repo, { parsePlanMarkdown, serviceLinksByRepo } = {}) {
  const fullName = repo.full_name;
  const isRemake = fullName.startsWith('sigco3111/');
  const origin = isRemake ? 'remake' : (repo.fork ? 'fork' : 'own');

  let commits = 0;
  try {
    commits = await countCommits(token, fullName, repo.default_branch);
  } catch (e) {
    if (e.code === 'RATE_LIMIT') throw e;
    commits = 0;
  }

  let ownCommits = null;
  if (repo.fork) ownCommits = await countForkOwnCommits(token, repo);

  const readme = await fetchText(token, fullName, 'README.md')
    ?? await fetchText(token, fullName, 'readme.md');
  const hasReadme = !!readme;
  const readmeLength = readme ? readme.length : 0;
  const readmeTemplate = hasReadme && readmeLength < 200 && /template|initial commit|getting started with/i.test(readme);

  const treeSize = repo.size ?? 0; // KB 단위 근사
  const fileCount = Math.max(1, Math.round(treeSize / 4)); // 근사 (정확 계수는 단계 내에서 보정)

  const liveHint = (serviceLinksByRepo || {})[fullName] || [];
  const { deployKind, hasDeployLink } = detectDeployKind({ ...repo }, liveHint);

  // 포크 원본: 목록 API에는 parent가 없으므로 단건 조회로 보완 (포크만)
  let parentFullName = repo.parent?.full_name || null;
  if (repo.fork && !parentFullName) {
    try {
      const single = await ghFetch(token, `/repos/${fullName}`);
      const detail = await single.json();
      parentFullName = detail.parent?.full_name || null;
    } catch { /* 원본 확인 필요로 남김 */ }
  }

  const tags = Array.isArray(repo.topics) ? repo.topics.slice(0, 10) : [];
  const releaseInfo = { hasReleases: false };
  try {
    const rel = await ghFetch(token, `/repos/${fullName}/releases?per_page=1`);
    const list = await rel.json();
    releaseInfo.hasReleases = Array.isArray(list) && list.length > 0;
  } catch { /* 선택 정보 */ }

  const sig = {
    commits,
    ownCommits,
    firstCommitAt: null, // 상세 커밋 API 절약 — last push로 대체
    lastPushAt: repo.pushed_at || null,
    hasReadme,
    readmeLength,
    readmeTemplate,
    hasPackageinfo: false,
    repoSizeKb: treeSize,
    fileCount,
    language: repo.language || null,
    hasDeployLink,
    hasReleases: releaseInfo.hasReleases,
    isFork: !!repo.fork,
    isPrivate: !!repo.private,
    archived: !!repo.archived,
    parentFullName,
  };

  // summary 초안: packageinfo.md 우선, 없으면 description + README 첫 단락
  let summary = '';
  let usedPackageinfo = false;
  if (parsePlanMarkdown) {
    const r = await summaryFromPackageinfo(token, fullName, parsePlanMarkdown);
    summary = r.summary;
    usedPackageinfo = r.usedPackageinfo;
    sig.hasPackageinfo = usedPackageinfo;
  }
  if (!summary) {
    const parts = [];
    if (repo.description) parts.push(repo.description.trim());
    const rs = summarizeReadme(readme);
    if (rs && !parts.includes(rs)) parts.push(rs);
    summary = parts.join(' — ').slice(0, 300);
  }

  // 비공개 레포: 초안에 내부정보 패턴이 보이면 비우고 미승인
  let summaryApproved = false;
  if (repo.private) {
    if (!summary || looksSensitive(summary)) summary = '';
    summaryApproved = false;
  } else {
    summaryApproved = true; // 공개 레포 요약은 그대로 공개
  }

  const maturity = decideMaturity({ ...sig, name: repo.name });

  return {
    repoFullName: fullName,
    name: repo.name,
    origin,
    originNote: isRemake ? '과거 상용 게임 리메이크 원작' : (repo.fork ? `포크: ${parentFullName || '원본 확인 필요'}` : null),
    maturityAuto: maturity.maturityAuto,
    isTestSuggest: maturity.isTestSuggest,
    refFork: maturity.refFork,
    deployKind,
    topic: guessTopic(repo, fileCount),
    isPrivateRepo: !!repo.private,
    summary: summary || null,
    summaryApproved,
    description: repo.description || null,
    githubUrl: repo.html_url,
    techStack: repo.language ? [repo.language] : [],
    tags,
    signals: sig,
    serviceLinksHint: liveHint.length > 0 ? liveHint : (hasDeployLink && repo.homepage ? [{ label: 'Live', url: repo.homepage }] : []),
    archived: !!repo.archived,
  };
}

// ── DB 반영 (store-v2 경유) ──
// 신규: INSERT. 기존: signals/maturity_auto/last_synced_at만 갱신.
// locked_fields에 든 필드는 어떤 경우에도 덮어쓰지 않는다.

export async function applyCollected(store, collected, { log } = {}) {
  let existing = await store.findByRepoFullName(collected.repoFullName);
  const now = new Date().toISOString();

  // 기존 행 연결: github_url 정확 일치 1건이면 repo_full_name을 채워 연결한다.
  // 모호하면(2건 이상) 새 행을 만들지 않고 로그에 남긴다.
  if (!existing && collected.githubUrl && typeof store.findByGithubUrlExact === 'function') {
    const candidates = (await store.findByGithubUrlExact(collected.githubUrl))
      .filter((r) => !r.repoFullName);
    if (candidates.length === 1) {
      await store.update(candidates[0].id, { repoFullName: collected.repoFullName, source: 'github-sync' });
      log?.(`연결: 기존 행 ↔ ${collected.repoFullName} (URL 일치)`);
      existing = await store.findByRepoFullName(collected.repoFullName);
    } else if (candidates.length > 1) {
      log?.(`수동 연결 필요: ${collected.githubUrl} (${candidates.length}건 모호)`);
      return { action: 'manual', id: null };
    }
  }

  if (!existing) {
    const created = await store.create({
      name: collected.name,
      summary: collected.summary,
      description: collected.description,
      githubUrl: collected.githubUrl,
      repoFullName: collected.repoFullName,
      source: 'github-sync',
      origin: collected.origin,
      originNote: collected.originNote,
      maturity: collected.maturityAuto,
      maturityAuto: collected.maturityAuto,
      deployKind: collected.deployKind,
      isTest: collected.isTestSuggest,
      topic: collected.topic,
      signals: collected.signals,
      lockedFields: [],
      isPrivateRepo: collected.isPrivateRepo,
      summaryApproved: collected.summaryApproved,
      techStack: collected.techStack,
      tags: collected.tags,
      serviceLinks: collected.serviceLinksHint,
      status: collected.archived ? 'archived' : 'development',
      lastSyncedAt: now,
    });
    log?.(`신규: ${collected.repoFullName} → ${collected.maturityAuto}`);
    return { action: 'created', id: created.id };
  }

  // 기존 행: 자동 필드만 갱신 (잠금 존중)
  const locked = new Set(existing.lockedFields || []);
  const patch = {
    signals: collected.signals,
    maturityAuto: collected.maturityAuto,
    lastSyncedAt: now,
    isPrivateRepo: collected.isPrivateRepo,
  };
  // maturity: 사용자가 바꾼 적 없고 잠겨 있지 않을 때만 자동값으로 갱신
  const maturityLocked = locked.has('maturity') || locked.has('maturityAuto');
  const userChangedMaturity = existing.maturity && existing.maturityAuto
    && existing.maturity !== existing.maturityAuto;
  if (!maturityLocked && !userChangedMaturity) patch.maturity = collected.maturityAuto;
  // 요약: 비어 있을 때만 초안 채움 (잠금/수동값 보존)
  if (!existing.summary && collected.summary && !locked.has('summary')) {
    patch.summary = collected.summary;
    if (!locked.has('summaryApproved')) patch.summaryApproved = collected.summaryApproved;
  }
  // 삭제/이름변경으로 안 보일 때는 호출부(markMissing)에서 처리 — 여기선 갱신만
  for (const k of Object.keys(patch)) {
    const snake = { maturityAuto: 'maturity_auto', lastSyncedAt: 'last_synced_at', isPrivateRepo: 'is_private_repo', summaryApproved: 'summary_approved' }[k] || k;
    if (locked.has(k) || locked.has(snake)) delete patch[k];
  }
  if (Object.keys(patch).length === 0) return { action: 'skipped', id: existing.id };
  const updated = await store.update(existing.id, patch);
  log?.(`갱신: ${collected.repoFullName} → ${updated.maturityAuto}`);
  return { action: 'updated', id: existing.id };
}

// 동기화에서 안 보인 레포: status='archived' + 경고 로그 (행 삭제 없음)
export async function markMissing(store, seenFullNames, { log } = {}) {
  const all = await store.findAllWithRepo();
  const seen = new Set(seenFullNames);
  const missing = all.filter((r) => !seen.has(r.repoFullName) && r.status !== 'archived');
  for (const m of missing) {
    await store.update(m.id, { status: 'archived' });
    log?.(`경고: ${m.repoFullName} — GitHub에서 안 보임 → archived (수동 연결 필요 확인)`);
  }
  return missing.map((m) => m.repoFullName);
}

// 전체 동기화 1회 실행
export async function syncAll({ token, store, parsePlanMarkdown, users = ['@me'], serviceLinksByRepo = {}, log = () => {} }) {
  if (!token) return { ok: false, reason: '토큰 미설정', created: 0, updated: 0, skipped: 0, archived: 0, manual: 0, errors: [] };
  const stats = { ok: true, created: 0, updated: 0, skipped: 0, archived: 0, manual: 0, errors: [] };
  const seen = [];
  for (const u of users) {
    let repos;
    try {
      repos = await listAllRepos(token, u);
    } catch (e) {
      if (e.code === 'RATE_LIMIT') { stats.ok = false; stats.rateLimited = true; break; }
      stats.errors.push(`${u}: ${e.message}`);
      continue;
    }
    for (const repo of repos) {
      try {
        const collected = await collectRepo(token, repo, { parsePlanMarkdown, serviceLinksByRepo });
        const r = await applyCollected(store, collected, { log });
        const key = r.action === 'created' ? 'created' : r.action === 'updated' ? 'updated' : r.action === 'manual' ? 'manual' : 'skipped';
        stats[key] += 1;
        seen.push(collected.repoFullName);
      } catch (e) {
        if (e.code === 'RATE_LIMIT') { stats.ok = false; stats.rateLimited = true; break; }
        stats.errors.push(`${repo.full_name}: ${e.message}`);
      }
    }
    if (stats.rateLimited) break;
  }
  try {
    const missing = await markMissing(store, seen, { log });
    stats.archived = missing.length;
  } catch (e) {
    stats.errors.push(`markMissing: ${e.message}`);
  }
  return stats;
}
