# dwHaviDashboard V2 — 처음부터 다시 만들기 (PLAN-v2)

날짜: 2026-10-07
전제: Vercel 자동 읽기 폐지. 기획서(md) 업로드 + 링크 직접 입력 + 게시판형 직접 CRUD.

## 1. Goal

- Vercel API/토큰 의존 없이 동작하는 포트폴리오 게시판
- 글쓰기 흐름: 기획서 md 업로드 → 자동채움 → 확인·수정 → 저장
- 링크(서비스/Vercel/데모 등)는 개수 제한 없이 추가·제거 가능
- 기존 문제(README 정규식 파서, Blob/Drive 이원화, 필드 혼선) 제거

## 2. 확정 요구사항 (마스터 지정)

- 기획서: **md만** (pdf/txt 미지원, .md 단일 파일)
- 링크: **동적 리스트** — 추가/제거 자유, 라벨+URL 쌍
- CRUD 직접 처리, 게시판 형태 (목록 → 상세 → 글쓰기/수정/삭제)

## 3. 데이터 모델 V2

```js
{
  id: string (UUID),
  name: string (필수),
  category: "web" | "mobile" | "ai" | "devops" | "tool",
  status: "active" | "development" | "archived",
  summary: string,
  description: string,
  techStack: string[],
  features: string[],
  tags: string[],
  githubUrl: string | null,
  serviceLinks: [{ label: string, url: string }],  // 신규, 동적
  planContent: string,    // md 원문 그대로 보관 (신규)
  planFilename: string,   // 신규
  screenshot: string | null,  // 단일 이미지 URL
  version: string,
  license: string,
  createdAt: string,
  updatedAt: string,
}
```

DB (Neon, fresh table 권장 — 기존 table과 충돌 방지):

```sql
CREATE TABLE projects_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  summary TEXT,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'web',
  status VARCHAR(20) NOT NULL DEFAULT 'development',
  thumbnail TEXT,
  github_url VARCHAR(500),
  service_links JSONB DEFAULT '[]',   -- [{label, url}]
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
```

삭제: goals, architecture, readme_content, start_date, featured, live_url(단일) → service_links로 대체.
주의: camelCase↔snake_case 매핑표는 첫날 확정. serviceLinks↔service_links, screenshot↔thumbnail 1:1 고정.

## 4. 기획서 md 파싱 규칙 (md 전용) + 호환 기준

### 4.0 호환 기준 (핵심 답변)

실제 ~/Projects 19개 packageinfo.md 실측 결과, 3계열로 갈림:

- 계열 A (대시보드 표준): summary/icon/tags/serviceUrl/deployType/serviceStatus/visible
  예: GalaxyBorn, battleship, MyResume, CatchingWords, pdf-editor, myFashionMaker, vercel-dashboard
- 계열 B (레거시/ASP형): name/version/status/description/tech_stack(object형)/author/created
  예: asp-code-browser, aspNet_StudyBrowser, sql-schema-extractor, asp-proc-extractor, asp-inspector, asp-prime-browser
- 계열 C (변형): title/keywords/repository (oracle-query-master), phase/external_apis[] (fishcast)

호환 기준은 "엄격한 단일 스펙 강제"가 아니라 "최소 코어 + 별칭 매핑 + 관대한 파싱"으로 잡아야 함.
이유: 이미 존재하는 19개 문서를 고치게 하면 도입 장벽이 생기고, 앞으로도 새 양식이 계속 나옴.

호환 3원칙:
1. 필수 최소값만 요구: 제목(name/title/H1 중 하나) + 본문(있으면). 나머지는 전부 optional + 기본값.
2. 별칭(alias) 매핑표로 흡수: 파서는 정식 필드명 1개만 보지 않고, 아래 매핑표 전체를 보고 먼저 발견되는 값을 채택.
3. 실패 금지: 파싱 실패해도 저장은 항상 성공. 원문 planContent는 무조건 보관, 못 읽은 필드는 빈칸으로 두고 사용자가 글쓰기 Step2에서 직접 채움.

별칭 매핑표 (plan-parse 공통):

| 정식 필드 | 별칭 (우선순위 순) | 정규화 규칙 |
|-----------|-------------------|-------------|
| name | name → title → H1 | trim, 없으면 파일명 |
| summary | summary → description | 300자 절단, description이 길면 첫 문장만 |
| tags | tags → keywords | 문자열이면 쉼표 split, 배열이면 그대로 |
| serviceLinks | serviceLinks[] → serviceUrl(단일) → external_apis[].url → repository(github) | 단일 URL은 [{label:'Live', url}]로 승격. external_apis는 name→label 매핑 |
| techStack | tech_stack → techStack → technologies | 배열이면 그대로. object형(runtime/build/db 등)이면 `key: value` 문자열로 펼쳐서 리스트화. 테이블형이면 셀 텍스트 추출 |
| status | status → serviceStatus → phase | active/development/archived/completed/planning으로 정규화. planning/inactive → development 또는 archived로 매핑 후 사용자 확인 |
| version/license/icon | 동일명만 | 없으면 빈칸 |
| author/created/updated | 동일명만 | DB 저장 안 함, 초안 미리보기 참고용 |

type 정규화:
- tech_stack이 object `{runtime: ..., build: ...}` → ["runtime: IE11 브라우저", "build: 단일 HTML"] 로 펼침
- tags가 `"a, b"` 문자열 → ["a","b"]
- serviceUrl `""` 빈문자 → 링크 0개로 처리 (에러 아님)
- frontmatter 자체가 깨지면 (예: CatchingWords 백틱 오타) → frontmatter 무시 + 본문만 파싱 + 경고 표시

신규 권장 표준 (앞으로 만들 문서용, 기존 문서 강제 아님):
`name, summary, tags[], serviceLinks[{label,url}], version, license` + 본문 `# 제목/## 주요 기능/## 기술스택`.
기존 문서는 그대로 업로드해도 위 매핑표로 읽히므로 수정 불필요.

### 4.1 파싱 우선순위

지원 형식 = 마스터 선호 `packageinfo.md` 호환:

```md
---
summary: 한 줄 요약
tags: [react, vercel]
version: 1.0.0
license: MIT
serviceLinks:
  - label: Live
    url: https://...
---

# 제목
본문...
## 주요 기능
- ...
## 기술스택
- ...
```

파싱 우선순위:
1. frontmatter(YAML): summary, tags, version, license, serviceLinks, category, status 있으면 채움
2. 본문 `# 제목` 첫 H1 → name (폼 비어있을 때만)
3. 본문 첫 단락 → summary (frontmatter 없을 때만)
4. `## 주요 기능|Features` 리스트 → features
5. `## 기술스택|Tech Stack` 리스트·콤마 → techStack
6. 원문 전체 → planContent, 파일명 → planFilename
7. 충돌 시: 사용자 입력값 우선, 파싱값은 빈 칸만 채움 (덮어쓰기 금지)

## 5. API 설계

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/projects?category=&status=&q= | 목록 (DB 필터/ILIKE 유지) |
| POST | /api/projects | 생성 (admin) |
| GET/PUT/DELETE | /api/projects/[id] | 단건 (admin: PUT/DELETE) |
| POST | /api/plan-parse | md 업로드 → 파싱 초안 반환 (인증 불필요 or admin, 선택) |
| POST/DELETE | /api/upload | 스크린샷 단일 경로 (Blob, admin) |
| POST | /api/auth | 기존 유지 |

삭제: `api/readme.js`, `api/drive-upload.js`, `api/drive-url.js`
의존 삭제: `googleapis` (jsonwebtoken, pg, @vercel/blob 유지)

`POST /api/plan-parse` 요청: multipart `file` (.md, 200KB 제한 권장) → 응답 `{ success, data: {name, summary, techStack, features, tags, serviceLinks, planContent, planFilename} }`.

## 6. UI 흐름 (게시판형)

```
목록: 검색 + 카테고리 + 상태 + 카드/리스트 토글 + [+ 새 글](admin)
상세: 제목/요약/배지 + 링크 버튼들(라벨별) + 기획서 원문 렌더 + 수정/삭제(admin)
글쓰기 Step 1: [기획서 md 올리기] or [빈 폼 시작]
글쓰기 Step 2: 자동채움 미리보기 → 필드 수정 → 링크 +/- → 스크린샷 1장 → 저장
```

링크 에디터: rows [{label, url}] + 추가 버튼 + 행별 삭제. url 형식 검증(https?://). 최소 0개 허용, 상한 10개.
기획서 렌더: 상세에서 `<pre>` or 경량 md 렌더 중 택1 (의존 추가 없이 가려면 <pre>+링크화, rich 렌더 원하면 `marked` 1개만).

ProjectForm 예상 구조 (300줄 제한 준수 위해 분리):
- ProjectForm.jsx (껍데기+저장)
- PlanUploadStep.jsx (md 업로드+초안 미리보기)
- LinkEditor.jsx (동적 링크 rows)
- 기존 스크린샷 Drive 탭 제거 → 단일 업로드로 축소

## 7. 처음부터 만들 때 순서

1. Phase 0: 기존 폴더 백업 태그 (`git tag v1-final`), 신규 브랜치 `v2-rebuild` or 새 폴더 (권장: 같은 레포 새 브랜치)
2. Phase 1: DB `projects_v2` 생성 + `lib/store.js` 재작성 (매핑표 확정, service_links JSONB 처리)
3. Phase 2: API 5개 (projects, [id], plan-parse, upload, auth) — plan-parse 먼저 단독 테스트
4. Phase 3: 프론트 목록/상세 (읽기만) → 글쓰기 Step1/Step2 → LinkEditor
5. Phase 4: auth 연결, admin 가드, Toast/빈상태/스켈레톤 이식 (기존 코드 재사용)
6. Phase 5: Vercel 재배포 (DATABASE_URL만, GITHUB_TOKEN/GOOGLE_* 삭제),旧데이터 이관 여부 결정

## 8. Files likely to change (신규 기준)

- 유지-개조: `api/projects.js`, `api/projects/[id].js`, `api/upload.js`(단순화), `api/auth.js`, `lib/store.js`(재작성), `lib/init-db.js`(v2 스키마)
- 신규: `api/plan-parse.js`, `src/components/PlanUploadStep.jsx`, `src/components/LinkEditor.jsx`
- 삭제: `api/readme.js`, `api/drive-upload.js`, `api/drive-url.js`
- 문서: `docs/PLAN-v2.md`(본 파일), `AGENTS.md` 갱신, `package.json`에서 googleapis 제거

## 9. Tests / validation

- `POST /api/plan-parse`에 샘플 md 3종(frontmatter 있음/없음/H1 없음) 투입 → 초안 필드 확인
- 링크 0/1/10개 생성·수정·삭제 → 상세 렌더 + DB JSONB round-trip 확인
- 200KB 초과 md, md 아닌 파일 업로드 → 400 에러 확인
- 기존처럼 `npm run dev` (vite 미들웨어) + `npm run build` 통과

## 10. Risks / open questions

- 기존 데이터 이관 여부: 구 projects → v2 일괄 이전 스크립트 필요? (live_url → serviceLinks 변환 규칙 필요)
- 기획서 원문이 길면(수십KB) 목록 API에서 제외하고 상세에서만 반환하는 편이 성능상 유리 → GET 목록은 plan_content 제외(SELECT 컬럼 지정) 권장
- md 렌더 범위: 원문 그대로 `<pre>`면 안전·저비용, md 렌더면 가독성↑·XSS 주의 (DOMPurify 필요)
- 스크린샷: Blob 단일 유지 vs URL 직접입력 추가? (현재안: 업로드 1경로 유지, 필요시 URL 입력 필드 1개 병행 — 결정 필요)
