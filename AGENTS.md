# dwHaviDashboard — AGENTS.md

## 개요
개인 프로젝트 포트폴리오 게시판(V2). 기획서 md 업로드 → 자동채움 → 직접 CRUD. Vercel 자동 읽기 없음.

## 기술 스택
- React 19 + Vite 8 + Tailwind CSS v4
- Vercel Serverless Functions (api/)
- Neon PostgreSQL `projects_v2` (lib/store-v2.js)

## 아키텍처
SPA + 서버리스 API. 클라이언트는 `/api/projects`로 CRUD, 기획서 파싱은 `/api/plan-parse`.
목록 API는 `plan_content` 제외(SELECT 지정), 상세에서 단건 조회로 원문 로드.

```
src/
  components/
    ProjectCard.jsx      # 카드 (썸네일, 상태 배지, 링크 아이콘 최대 3개)
    ProjectForm.jsx      # 2단계 폼 (Step1 기획서 / Step2 내용+링크)
    PlanUploadStep.jsx   # md 업로드 + 초안 미리보기
    LinkEditor.jsx       # 동적 링크 rows (0~10개)
    ProjectModal.jsx     # 상세 (SectionTitle/InfoRow는 파일 상단 분리 정의)
    Toast.jsx
  utils/validators.js    # isValidUrl (LinkEditor/ProjectForm 공용)
  hooks/useDebounce.js
  data/projects.js       # API 클라이언트 (parsePlanFile 포함)
api/
  projects.js            # GET/POST → store-v2
  projects/[id].js       # GET/PUT/DELETE → store-v2
  plan-parse.js          # md 파싱 (multipart + JSON 폴백, 200KB 제한)
  upload.js              # Blob 단일 업로드
  auth.js                # 비밀번호 JWT
lib/
  planParser.js          # md 파서, 의존성 없음 (splitFrontmatter/parsePlanMarkdown)
  store-v2.js            # 확정 매핑표, service_links JSONB
  init-db-v2.js          # V2 스키마 생성
  store.js / init-db.js  # V1 잔재 (미사용, 린트 면제)
```

## 핵심 규칙
1. API 시크릿은 서버리스 런타임(process.env)에서만 접근. `.env` 직접 읽지 말 것
2. `service_links`는 JSONB — pg 드라이버에 JSON.stringify 후 전달 (TEXT[]와 다름)
3. 목록 API에 plan_content 포함 금지 (성능)
4. 컴포넌트 300줄, API 150줄 이하 유지
5. SectionTitle/InfoRow 같은 소컴포넌트는 렌더 밖(파일 상단) 정의 — react-hooks/static-components
6. 공용 함수는 `src/utils/`로 분리 — react-refresh/only-export-components
7. 로컬 `.env` DATABASE_URL이 stale일 수 있음 → DB 에러 시 `vercel env pull`로 Production 값 대조 (파일 수정 전 마스터 확인)

## 데이터 모델 (V2)
- **id**: UUID
- **status**: `active` | `development` | `archived`
- **category**: `web` | `mobile` | `ai` | `devops` | `tool`
- **serviceLinks**: `[{label, url}]` (JSONB)
- **fields**: name, summary, description, techStack[], features[], tags[], githubUrl, serviceLinks, planContent, planFilename, screenshot→thumbnail, version, license

## 로컬 개발
```bash
npm install
npm run dev              # Vite dev server (port 5173) + API middleware
```
vite.config.js의 API 미들웨어가 Vercel 핸들러를 Express 미들웨어로 래핑. `[id]` 동적 라우트도 지원. `/api/plan-parse` 등록됨.

## 배포
```bash
VTOKEN=$(head -1 ~/Projects/vercel-dashboard/.env | cut -d'=' -f2-)
vercel --prod --token="$VTOKEN"
```
- Vercel 프로젝트: `dw-havi-dashboard`
- 배포 URL: https://dw-havi-dashboard.vercel.app
- `.vercel/project.json`로 프로젝트 연결 (gitignore)

## 환경변수 (Vercel)
| 변수 | 용도 | 필수 |
|------|------|------|
| DATABASE_URL | Neon PostgreSQL 연결 | 필수 |
| BLOB_READ_WRITE_TOKEN | 스크린샷 업로드 | 선택 |
| ADMIN_PASSWORD | 관리자 JWT | 필수 |

## 알려진 제약
- 기획서 md 200KB 초과 → 400, md 아닌 파일 → 400
- 구 단일 serviceUrl은 store-v2에서 service_links로 자동 승격 (호환용)
