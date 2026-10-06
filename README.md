# dwHaviDashboard (V2)

개인 프로젝트 포트폴리오 게시판. 기획서 md 업로드 → 자동채움 → 직접 CRUD. Vercel 자동 읽기 없음.

**Live:** [dw-havi-dashboard.vercel.app](https://dw-havi-dashboard.vercel.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 |
| Backend | Vercel Serverless Functions |
| Database | Neon PostgreSQL (`projects_v2`) |
| Auth | 비밀번호 JWT (`#admin`) |
| Storage | Vercel Blob (스크린샷 단일) |
| Deploy | Vercel |

## Features

- 프로젝트 카드 CRUD (생성, 수정, 삭제)
- 카테고리 필터 (web, mobile, ai, devops, tool)
- 상태 필터 (active, development, archived)
- 키워드 검색 (300ms 디바운스)
- 프로젝트 상세 모달 (링크 버튼, 기획서 원문, 태그, GitHub)
- 기획서 md 업로드 → 폼 자동채움 (`POST /api/plan-parse`, 200KB 이하, md만)
- 서비스 링크 동적 리스트 (라벨+URL, 0~10개, 추가·제거 자유)
- 스크린샷 단일 업로드 (Vercel Blob)

## Project Structure

```
src/
  components/
    ProjectCard.jsx      # 프로젝트 카드 (썸네일, 상태 배지, 링크 아이콘)
    ProjectForm.jsx      # 2단계 폼 (Step1 기획서 / Step2 내용+링크)
    PlanUploadStep.jsx   # 기획서 md 업로드 + 초안 미리보기
    LinkEditor.jsx       # 동적 링크 rows
    ProjectModal.jsx     # 상세 모달 (링크 버튼, 기획서 원문)
    Toast.jsx            # 에러/성공 알림
  utils/validators.js    # isValidUrl
  hooks/useDebounce.js   # 검색 디바운스
  data/projects.js       # API 클라이언트
api/
  projects.js            # GET (필터/검색) / POST
  projects/[id].js       # GET / PUT / DELETE
  plan-parse.js          # 기획서 md 파싱 (multipart + JSON 폴백)
  upload.js              # Blob 스크린샷 업로드/삭제
  auth.js                # 비밀번호 로그인
lib/
  planParser.js          # md 파서 (의존성 없음, 별칭 매핑)
  store-v2.js            # PostgreSQL CRUD (projects_v2)
  init-db-v2.js          # V2 스키마 생성 스크립트
docs/
  PLAN.md                # V1 계획 (보존)
  PLAN-v2.md             # V2 계획
```

## Data Model (V2)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | 고유 식별자 |
| name | string | 프로젝트명 (필수) |
| summary/description | string | 요약/상세 |
| status | enum | `active` · `development` · `archived` |
| category | enum | `web` · `mobile` · `ai` · `devops` · `tools` |
| serviceLinks | JSONB | `[{label, url}]` 0~10개 |
| techStack/tags/features | TEXT[] | 배열 |
| planContent/planFilename | TEXT | 기획서 원문 + 파일명 (목록 API 제외) |
| screenshot→thumbnail | string | 스크린샷 URL |
| githubUrl/version/license | string | 기타 |

## Getting Started

```bash
npm install
npm run dev
```

Vite dev server (port 5173)에서 실행됩니다. `vite.config.js`의 API 미들웨어가 Vercel 서버리스 핸들러를 로컬에서도 동작하도록 래핑합니다.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 | Yes |
| `BLOB_READ_WRITE_TOKEN` | 스크린샷 업로드 (Vercel Blob) | No |
| `ADMIN_PASSWORD` | 관리자 비밀번호 (JWT 시크릿 겸용) | Yes |

## Deploy

```bash
source ~/Projects/vercel-dashboard/.env
# VERCEL_TOKEN은 ~/Projects/vercel-dashboard/.env 첫 줄
vercel --prod --token="$VERCEL_TOKEN"
```

## Known Limitations

- 로컬 `.env`의 DATABASE_URL이 구 비밀번호일 수 있음 → Vercel Production 값과 다르면 `vercel env pull`로 대조
- 기획서 md 200KB 초과 시 400, md 아닌 파일 거부
- 목록 API는 plan_content 제외 (성능), 상세에서 단건 조회

## License

Private
