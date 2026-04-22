# dwHaviDashboard — 세이브포인트

**날짜:** 2026-04-22
**상태:** Phase 1~5 완료, Neon DB + Vercel Blob 연동 완료, 프로덕션 배포됨

## 완료된 단계
- [x] Phase 1: 백엔드 API + 프론트엔드 API 연동
- [x] Phase 2: Toast 알림, 프로젝트 수정 폼, 검색 debounce(300ms), 빈 상태 UI
- [x] Phase 3: 상태 필터 (Active/Dev/Archived), 데이터 흐름 고도화
- [x] Phase 4: 모바일 반응형, 카드 hover 애니메이션, 스켈레톤 로딩
- [x] Phase 5: Vercel 배포 + AGENTS.md
- [x] Phase 6: Neon PostgreSQL 연동 (JSON 파일 → DB 교체)
- [x] Phase 7: Vercel Blob 스크린샷 업로드
- [x] Phase 8: 구글 드라이브 스크린샷 연동 (URL 변환 + 파일 업로드)

## 배포 정보
- **URL:** https://dw-havi-dashboard.vercel.app
- **Vercel 프로젝트:** dw-havi-dashboard
- **GitHub:** dwhavi/dwHaviDashboard (private)

## 데이터베이스
- **Neon PostgreSQL:** ap-southeast-1 (싱가포르)
- **테이블:** projects (UUID PK, snake_case 컬럼)
- **연동:** lib/store.js → pg 패키지 (매 요청 새 커넥션, Neon 서버리스 패턴)
- **필터링:** DB 레벨 (category, status, ILIKE 검색)

## 파일 스토리지
- **Vercel Blob:** 스크린샷 업로드 (POST) / 삭제 (DELETE)
- **구글 드라이브:** 스크린샷 업로드 + URL 변환 (`api/drive-upload.js`, `api/drive-url.js`)
- **제한 (Blob):** 1MB, jpg/jpeg/png/gif/webp만 허용
- **제한 (Drive):** 5MB, jpg/jpeg/png/gif/webp만 허용
- **api/upload.js:** multipart 파싱 + put/del (@vercel/blob)

## Vercel 환경변수
| 변수 | 용도 | 필수 |
|------|------|------|
| DATABASE_URL | Neon PostgreSQL 연결 | 필수 |
| BLOB_READ_WRITE_TOKEN | Vercel Blob 업로드/삭제 | 선택 |
| GOOGLE_CLIENT_EMAIL | 구글 드라이브 서비스 계정 이메일 | Drive 사용 시 필수 |
| GOOGLE_PRIVATE_KEY | 구글 드라이브 서비스 계정 개인키 | Drive 사용 시 필수 |
| GOOGLE_DRIVE_FOLDER_ID | 드라이브 업로드 대상 폴더 | 선택 |

## 프로젝트 구조
```
~/projects/dwHaviDashboard/
├── api/
│   ├── projects.js          # GET/POST (DB 필터/검색)
│   ├── projects/[id].js     # GET/PUT/DELETE 단건 CRUD
│   ├── upload.js            # Vercel Blob 스크린샷 업로드/삭제
│   ├── drive-upload.js      # 구글 드라이브 스크린샷 업로드
│   ├── drive-url.js         # 구글 드라이브 URL → 공개 이미지 변환
│   └── readme.js            # GitHub README fetch + 정규식 파싱
├── lib/
│   ├── store.js             # PostgreSQL CRUD (pg)
│   └── init-db.js           # DB 테이블 초기화 스크립트
├── data/
│   └── projects.json        # (더 이상 사용 안 함, DB 사용)
├── src/
│   ├── data/projects.js     # API 클라이언트 함수
│   ├── components/
│   │   ├── ProjectCard.jsx
│   │   ├── ProjectForm.jsx
│   │   ├── ProjectModal.jsx
│   │   └── Toast.jsx
│   ├── hooks/useDebounce.js
│   └── App.jsx
├── AGENTS.md
├── vite.config.js
└── package.json
```

## 기술 스택
- Vite 8 + React 19 + Tailwind CSS v4
- Vercel Serverless Functions (api/)
- Neon PostgreSQL (pg)
- Vercel Blob (@vercel/blob)

## 향후 개선 포인트
- README AI 구조화 (OpenAI API)
- 커스텀 도메인 연결
