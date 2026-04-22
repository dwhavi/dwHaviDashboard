# dwHaviDashboard — AGENTS.md

## 개요
개인 프로젝트 포트폴리오 대시보드. 프로젝트 카드 형태로 작품을 관리/전시하고, 카테고리·상태 필터, 키워드 검색, 상세 모달을 제공한다.

## 기술 스택
- React 19 + Vite 8 + Tailwind CSS v4
- Vercel Serverless Functions (api/)
- JSON 파일 기반 저장소 (lib/store.js → data/projects.json)

## 아키텍처
SPA + 서버리스 API. 클라이언트는 `/api/projects`로 CRUD, 서버는 `data/projects.json` 파일에 읽고 씀.

```
src/
  components/
    ProjectCard.jsx      # 프로젝트 카드 (썸네일, 상태 배지, hover 애니메이션)
    ProjectForm.jsx      # 생성/수정 폼 (이미지 업로드 포함)
    ProjectModal.jsx     # 상세 모달 (수정/삭제 버튼)
    Toast.jsx            # 에러/성공 알림
  hooks/useDebounce.js  # 검색 디바운스 (300ms)
  data/projects.js      # API 클라이언트 함수
api/
  projects.js           # GET (필터/검색/페이지네이션) / POST
  projects/[id].js      # GET / PUT / DELETE 단일 프로젝트
  upload.js             # multipart 스크린샷 업로드
  readme.js             # GitHub README 페치 + 파싱
lib/store.js            # JSON 파일 CRUD (fs)
data/projects.json      # 프로젝트 데이터 (gitignore, Vercel 런타임 전용)
```

## 핵심 규칙
1. API 토큰/시크릿은 서버리스 런타임(process.env)에서만 접근
2. `data/projects.json`은 gitignore — Vercel 런타임에서만 접근 (읽기 전용, 쓰기는 별도 스토리지 필요)
3. 업로드는 `public/screenshots/`에 저장 (dev) / Vercel Blob (prod, BLOB_READ_WRITE_TOKEN 필요)
4. 컴포넌트 300줄, API 150줄 이하 유지
5. README.md가 프로젝트 표준 문서

## 데이터 모델
- **id**: UUID
- **status**: `active` | `development` | `archived`
- **category**: `web` | `mobile` | `ai` | `devops` | `tools`
- **fields**: title, description, thumbnail, screenshots[], githubUrl, liveUrl, tags[], startDate, readmeContent

## 로컬 개발
```bash
npm install
npm run dev              # Vite dev server (port 5173) + API middleware
```
vite.config.js의 API 미들웨어가 Vercel 핸들러를 Express 미들웨어로 래핑. `[id]` 동적 라우트도 지원.

## 배포
```bash
source /home/dwhavi/projects/vercel-dashboard/.env
vercel --prod --token="$VERCEL_TOKEN"
```
- Vercel 프로젝트: `dw-havi-dashboard`
- 배포 URL: https://dw-havi-dashboard.vercel.app
- `.vercel/project.json`로 프로젝트 연결 (gitignore)

## 환경변수 (Vercel)
| 변수 | 용도 | 필수 |
|------|------|------|
| BLOB_READ_WRITE_TOKEN | 프로덕션 파일 업로드 (Vercel Blob) | 선택 |

## 알려진 제약
- Vercel 서버리스 함수의 파일시스템은 읽기 전용 → `data/projects.json` 초기 배포 시 업로드 필요, 쓰기는 Vercel Blob 등 외부 스토리지로 전환 필요
- `upload.js`는 dev 모드에서 `public/screenshots/` 사용, prod에서는 Vercel Blob 필요
