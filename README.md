# dwHaviDashboard

개인 프로젝트 포트폴리오 대시보드. 프로젝트 카드 형태로 작품을 관리·전시하며 카테고리·상태 필터, 키워드 검색, 상세 모달을 제공합니다.

**Live:** [dw-havi-dashboard.vercel.app](https://dw-havi-dashboard.vercel.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 |
| Backend | Vercel Serverless Functions |
| Database | Neon PostgreSQL |
| Auth | Google OAuth |
| Storage | Vercel Blob (prod), Local FS (dev) |
| Deploy | Vercel |

## Features

- 프로젝트 카드 CRUD (생성, 수정, 삭제)
- 카테고리 필터 (web, mobile, ai, devops, tools)
- 상태 필터 (active, development, archived)
- 키워드 검색 (300ms 디바운스)
- 프로젝트 상세 모달 (스크린샷, 태그, GitHub/라이브 링크)
- GitHub README 자동 페치 및 파싱
- 스크린샷 업로드

## Project Structure

```
src/
  components/
    ProjectCard.jsx      # 프로젝트 카드 (썸네일, 상태 배지, hover 애니메이션)
    ProjectForm.jsx      # 생성/수정 폼 (이미지 업로드 포함)
    ProjectModal.jsx     # 상세 모달 (수정/삭제 버튼)
    Toast.jsx            # 에러/성공 알림
  hooks/useDebounce.js  # 검색 디바운스
  data/projects.js      # API 클라이언트
api/
  projects.js           # GET (필터/검색/페이지네이션) / POST
  projects/[id].js      # GET / PUT / DELETE
  upload.js             # multipart 스크린샷 업로드
  readme.js             # GitHub README 페치 + 파싱
lib/
  store.js              # JSON 파일 CRUD
data/
  projects.json         # 프로젝트 데이터 (gitignore)
```

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | 고유 식별자 |
| title | string | 프로젝트명 |
| description | string | 설명 |
| status | enum | `active` · `development` · `archived` |
| category | enum | `web` · `mobile` · `ai` · `devops` · `tools` |
| thumbnail | string | 썸네일 URL |
| screenshots | string[] | 스크린샷 URL 목록 |
| githubUrl | string | GitHub 저장소 링크 |
| liveUrl | string | 라이브 배포 링크 |
| tags | string[] | 태그 |
| startDate | string | 시작일 |
| readmeContent | string | GitHub README 원문 |

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
| `BLOB_READ_WRITE_TOKEN` | 프로덕션 파일 업로드 (Vercel Blob) | No |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | Yes |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google 서비스 계정 키 (JSON) | No |

## Deploy

```bash
source /home/dwhavi/projects/vercel-dashboard/.env
vercel --prod --token="$VERCEL_TOKEN"
```

## Known Limitations

- Vercel 서버리스 함수의 파일시스템은 읽기 전용 → 쓰기는 Neon DB 또는 Vercel Blob 사용
- `upload.js`는 dev에서 `public/screenshots/`, prod에서 Vercel Blob 사용

## License

Private
