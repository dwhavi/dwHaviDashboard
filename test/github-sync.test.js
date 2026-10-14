// 단계 2 단위 테스트: 성숙도 규칙 경계값, 포크 내 커밋, remake 지정, 잠금 보존.
// 실행: npm test (외부 API 호출 없음 — 순수 함수 + 인메모리 가짜 store만 사용)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decideMaturity, applyCollected, __setMaturityConfig } from '../lib/githubSync.js';

__setMaturityConfig({
  seed: { maxCommits: 5, maxFiles: 3 },
  testNamePattern: '^(test|tmp|demo|sandbox)[-_]?|[-_](test|tmp|demo)$',
  readmeTemplateMinLength: 200,
});
const CFG = {
  seed: { maxCommits: 5, maxFiles: 3 },
  testNamePattern: '^(test|tmp|demo|sandbox)[-_]?|[-_](test|tmp|demo)$',
  readmeTemplateMinLength: 200,
};

function sig(over = {}) {
  return {
    name: 'myapp', commits: 10, fileCount: 20, hasReadme: true,
    readmeLength: 800, readmeTemplate: false, hasDeployLink: false,
    ownCommits: null, isFork: false, isRemake: false, ...over,
  };
}

describe('decideMaturity 경계값', () => {
  it('커밋 5 = Seed, 6 + README = Building', () => {
    assert.equal(decideMaturity(sig({ commits: 5 }), CFG).maturityAuto, 'seed');
    assert.equal(decideMaturity(sig({ commits: 6 }), CFG).maturityAuto, 'building');
  });
  it('파일 3개 이하 = Seed', () => {
    assert.equal(decideMaturity(sig({ fileCount: 3 }), CFG).maturityAuto, 'seed');
  });
  it('README 없음 = Seed', () => {
    assert.equal(decideMaturity(sig({ hasReadme: false }), CFG).maturityAuto, 'seed');
  });
  it('배포 링크 + Building 조건 = Shipped', () => {
    assert.equal(decideMaturity(sig({ hasDeployLink: true }), CFG).maturityAuto, 'shipped');
  });
  it('배포 링크 있어도 커밋 부족이면 Seed (Shipped 아님)', () => {
    assert.equal(decideMaturity(sig({ hasDeployLink: true, commits: 2 }), CFG).maturityAuto, 'seed');
  });
  it('test/tmp/demo 이름이면 isTest 제안', () => {
    assert.equal(decideMaturity(sig({ name: 'demo-play' }), CFG).isTestSuggest, true);
    assert.equal(decideMaturity(sig({ name: 'myapp' }), CFG).isTestSuggest, false);
  });
});

describe('포크 내 커밋 수 계산', () => {
  it('포크 + 내 커밋 0 → Seed + 참고용', () => {
    const r = decideMaturity(sig({ isFork: true, ownCommits: 0 }), CFG);
    assert.equal(r.maturityAuto, 'seed');
    assert.equal(r.refFork, true);
  });
  it('포크 + 내 커밋 3, 배포 없음 → Seed (커밋 5 이하이므로)', () => {
    const r = decideMaturity(sig({ isFork: true, ownCommits: 3, commits: 3 }), CFG);
    assert.equal(r.maturityAuto, 'seed');
  });
  it('포크 + 내 커밋 있고 전체 커밋 충분 → Building', () => {
    const r = decideMaturity(sig({ isFork: true, ownCommits: 8, commits: 50 }), CFG);
    assert.equal(r.maturityAuto, 'building');
    assert.equal(r.refFork, false);
  });
});

// 인메모리 가짜 store
function fakeStore(rows = []) {
  const db = new Map(rows.map((r) => [r.repoFullName, { ...r }]));
  return {
    async findByRepoFullName(k) { return db.get(k) || null; },
    async findAllWithRepo() { return [...db.values()]; },
    async create(d) { const r = { id: `id-${db.size}`, lockedFields: [], ...d }; db.set(r.repoFullName, r); return r; },
    async update(id, patch) {
      const r = [...db.values()].find((x) => x.id === id);
      Object.assign(r, patch);
      return r;
    },
    _db: db,
  };
}

function collected(over = {}) {
  return {
    repoFullName: 'dwhavi/myapp', name: 'myapp', origin: 'own', originNote: null,
    maturityAuto: 'building', isTestSuggest: false, refFork: false, deployKind: 'none',
    topic: 'app', isPrivateRepo: false, summary: '초안 요약', summaryApproved: true,
    description: 'desc', githubUrl: 'https://github.com/dwhavi/myapp',
    techStack: ['JavaScript'], tags: [], signals: { commits: 10 },
    serviceLinksHint: [], archived: false, ...over,
  };
}

describe('잠금 필드 보존', () => {
  it('maturity 수동 변경 후 동기화해도 유지', async () => {
    const store = fakeStore([{
      id: 'id-0', repoFullName: 'dwhavi/myapp', maturity: 'shipped', maturityAuto: 'building',
      lockedFields: ['maturity'], summary: '내 요약', signals: { commits: 1 },
    }]);
    const r = await applyCollected(store, collected({ maturityAuto: 'building' }));
    assert.equal(r.action, 'updated');
    const row = store._db.get('dwhavi/myapp');
    assert.equal(row.maturity, 'shipped'); // 유지
    assert.equal(row.maturityAuto, 'building'); // 자동값은 갱신
    assert.equal(row.summary, '내 요약'); // 수동 요약 유지
  });
  it('잠금 해제 후 동기화하면 자동값으로 복귀', async () => {
    const store = fakeStore([{
      id: 'id-0', repoFullName: 'dwhavi/myapp', maturity: 'building', maturityAuto: 'building',
      lockedFields: [], summary: null, signals: { commits: 1 },
    }]);
    const r = await applyCollected(store, collected({ maturityAuto: 'shipped' }));
    assert.equal(r.action, 'updated');
    assert.equal(store._db.get('dwhavi/myapp').maturity, 'shipped');
  });
  it('멱등: 같은 동기화 2번 실행해도 행이 늘지 않음', async () => {
    const store = fakeStore([]);
    await applyCollected(store, collected());
    await applyCollected(store, collected());
    assert.equal(store._db.size, 1);
  });
});
