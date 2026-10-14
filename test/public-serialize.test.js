// 공개 직렬화 필터 자동 테스트 (node:test, 의존성 없음).
// 실행: npm test
// 비공개 레포가 비로그인 응답에 금지 필드를 노출하지 않는지 검증한다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serializePublic, serializePublicList } from '../lib/store-v2.js';

const FORBIDDEN = [
  'repo_full_name',
  'repoFullName',
  'github.com',
  'README 원문',
  'planContent',
  'plan_content',
  'thumbnail',
  'signals',
  '상세 원문',
];

const privateRepo = {
  id: 'uuid-test-1',
  name: '내부도구',
  summary: '사내 시스템 연동 도구',
  description: '상세 원문',
  category: 'tool',
  status: 'active',
  thumbnail: 'https://blob/shot.png',
  githubUrl: 'https://github.com/dwhavi/secret',
  repoFullName: 'dwhavi/secret',
  maturity: 'building',
  maturityAuto: 'building',
  topic: 'tool',
  tags: ['node'],
  origin: 'own',
  deployKind: null,
  signals: { commits: 42, readme: 'README 원문 전체...' },
  lockedFields: [],
  isPrivateRepo: true,
  summaryApproved: false,
  planContent: '# secret plan',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('공개 직렬화 (비공개 레포 필드 제한)', () => {
  it('미승인 비공개 레포: 허용 키만 반환, summary는 null', () => {
    const out = serializePublic(privateRepo);
    assert.deepStrictEqual(Object.keys(out).sort(), [
      'deployKind',
      'id',
      'lastActivity',
      'maturity',
      'name',
      'origin',
      'summary',
      'tags',
      'topic',
    ]);
    assert.equal(out.summary, null);
  });

  it('미승인 비공개 레포: 금지 문자열이 JSON 어디에도 없음', () => {
    const json = JSON.stringify(serializePublic(privateRepo));
    for (const s of FORBIDDEN) assert.ok(!json.includes(s), `유출: ${s}`);
  });

  it('승인된 비공개 레포: summary 공개, 그래도 금지 필드 없음', () => {
    const out = serializePublic({ ...privateRepo, summaryApproved: true });
    assert.equal(out.summary, '사내 시스템 연동 도구');
    const json = JSON.stringify(out);
    for (const s of FORBIDDEN) assert.ok(!json.includes(s), `유출: ${s}`);
  });

  it('공개 레포는 전체 필드 그대로 반환', () => {
    const pub = { ...privateRepo, isPrivateRepo: false };
    const out = serializePublic(pub);
    assert.equal(out.githubUrl, pub.githubUrl);
    assert.equal(out.planContent, pub.planContent);
  });

  it('목록도 같은 함수로 변환 (단일 출구)', () => {
    const out = serializePublicList([privateRepo, { ...privateRepo, isPrivateRepo: false }]);
    assert.equal(out[0].summary, null);
    assert.equal(out[1].githubUrl, privateRepo.githubUrl);
  });
});
