// 첫 임포트 로컬 실행기: DATABASE_URL + GITHUB_TOKEN 환경변수로 실행.
//   cd ~/projects/dwHaviDashboard && DATABASE_URL=... GITHUB_TOKEN=... node scripts/sync-local.js
// reports/import-YYYYMMDD.md (KST) 생성. 토큰 없으면 변경 없이 종료.
import { mkdirSync, writeFileSync } from 'node:fs';
import * as store from '../lib/store-v2.js';
import { syncAll } from '../lib/githubSync.js';
import { parsePlanMarkdown } from '../lib/planParser.js';
import { VERCEL_LIVE_MAP } from '../config/vercel-live-map.js';

const warnings = [];
const stats = await syncAll({
  token: process.env.GITHUB_TOKEN || null,
  store,
  parsePlanMarkdown,
  users: ['@me'],
  serviceLinksByRepo: VERCEL_LIVE_MAP,
  log: (m) => { warnings.push(m); console.log(' -', m); },
});
console.log('STATS:', JSON.stringify({ ...stats, errors: stats.errors?.length ?? 0 }));

if ((stats.created + stats.updated + stats.skipped) > 0) {
  const rows = await store.findAllWithRepo();
  rows.sort((a, b) => (a.repoFullName || '').localeCompare(b.repoFullName || ''));
  const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

  // 지시서 예상 분류와 실제 비교 (수락 기준: 큰 차이는 리포트에 기록)
  const expected = {
    shipped: ['dwHaviDashboard', 'aspNet_StudyBrowser', 'MyResume', 'pdf-editor', 'quotaMonitor', 'vercel-dashboard', 'battleship', 'CatchingWords', 'sql-schema-extractor', 'db-schema-doc'],
    building: ['Oracle_SqlAnalyzer', 'stock-trading-dashboard', 'dwhavi_budget', 'nim-response-monitor', 'cable-globe', 'fishcast', 'ai-meal-planner', 'virtual-trading-system', 'minesweeper', 'GalaxyBorn', 'myFashionMaker'],
    seed: ['dwHome', 'dwhavi_ai_openclaw', 'openai-harness-engineering', 'idea-bank-mine', 'hermes-skills'],
  };
  const byName = new Map(rows.map((r) => [r.repoFullName.split('/')[1], r]));
  const diffs = [];
  for (const [level, names] of Object.entries(expected)) {
    for (const n of names) {
      const r = byName.get(n);
      if (!r) { diffs.push(`- ${n}: 예상 ${level}이나 레포 미발견(삭제/개명 확인 필요)`); continue; }
      if (r.maturity !== level) {
        const s = r.signals || {};
        diffs.push(`- ${r.repoFullName}: 예상 ${level} → 실제 ${r.maturity} (커밋 ${s.commits ?? '?'} · README ${s.hasReadme ? s.readmeLength + '자' : '없음'} · 배포 ${r.deployKind} · 포크내커밋 ${s.ownCommits ?? '-'})`);
      }
    }
  }

  const lines = [
    `# 임포트 리포트 (${kst})`,
    '',
    `- 신규 ${stats.created} · 갱신 ${stats.updated} · 유지 ${stats.skipped} · 보관 ${stats.archived} · 수동연결필요 ${stats.manual || 0}`,
    `- 실패 ${stats.errors.length}${stats.rateLimited ? ' (rate limit 중단 — 다음 실행에서 이어감)' : ''}`,
    `- sigco3111: 보류 (마스터 결정, 347개 공개 확인)`,
    '',
    '## 예상 분류와의 차이 (signals 기준 실제값 우선)',
    '',
    ...(diffs.length ? diffs : ['- 차이 없음']),
    '',
    '| 레포 | 공개/비공개 | origin | maturity | topic | deploy | summary | 비고 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const note = [];
    if (r.origin === 'fork' && r.signals?.ownCommits === 0) note.push('참고용 포크');
    if (!r.summary) note.push('요약 없음');
    if (r.isPrivateRepo && !r.summaryApproved) note.push('승인 대기');
    lines.push(`| ${r.repoFullName} | ${r.isPrivateRepo ? '비공개' : '공개'} | ${r.origin} | ${r.maturity} | ${r.topic || '-'} | ${r.deployKind || '-'} | ${r.summary ? '있음' : '없음'} | ${note.join(', ') || '-'} |`);
  }
  if (stats.errors.length) {
    lines.push('', '## 오류', '', ...stats.errors.map((e) => `- ${e}`));
  }
  mkdirSync('reports', { recursive: true });
  const outPath = `reports/import-${kst}.md`;
  writeFileSync(outPath, lines.join('\n') + '\n');
  console.log('리포트:', outPath);
}
