# dwHaviDashboard — 세이브포인트

**날짜:** 2026-04-22
**상태:** Phase 1~5 전체 완료, 프로덕션 배포됨

## 완료된 단계
- [x] Phase 1: 백엔드 API + 프론트엔드 API 연동
- [x] Phase 2: Toast 알림, 프로젝트 수정 폼, 검색 debounce(300ms), 빈 상태 UI
- [x] Phase 3: 상태 필터 (Active/Dev/Archived), 데이터 흐름 고도화
- [x] Phase 4: 모바일 반응형, 카드 hover 애니메이션, 스켈레톤 로딩
- [x] Phase 5: Vercel 배포 + AGENTS.md

## 배포 정보
- **URL:** https://dw-havi-dashboard.vercel.app
- **Vercel 프로젝트:** dw-havi-dashboard (prj_88MMl9s01uM5tgtza3hFN4givAsY)
- **GitHub:** dwhavi/dwHaviDashboard (private)
- **data/projects.json:** 빈 배열 `[]` — 프로젝트 직접 등록 예정

## 프로젝트 구조
```
~/projects/dwHaviDashboard/
├── api/
│   ├── projects.js          # GET/POST (필터/검색/페이지네이션)
│   ├── projects/[id].js     # GET/PUT/DELETE 단건 CRUD
│   ├── upload.js            # 스크린샷 업로드 (multipart)
│   └── readme.js            # GitHub README fetch + 정규식 파싱
├── lib/
│   └── store.js             # JSON 파일 기반 CRUD
├── data/
│   └── projects.json        # 빈 배열 (프로덕션)
├── src/
│   ├── data/projects.js     # API 클라이언트 함수
│   ├── components/
│   │   ├── ProjectCard.jsx  # 카드 (상태 배지, hover 애니메이션)
│   │   ├── ProjectForm.jsx  # 생성/수정 폼
│   │   ├── ProjectModal.jsx # 상세 모달 (수정/삭제)
│   │   └── Toast.jsx        # 에러/성공 알림
│   ├── hooks/useDebounce.js # 검색 디바운스 (300ms)
│   ├── App.jsx              # 메인 (API 연동, 필터, 검색)
│   ├── App.css, index.css, main.jsx
├── AGENTS.md
├── vite.config.js           # Vite + API dev 미들웨어
├── .vercel/project.json     # Vercel 프로젝트 연결
└── package.json
```

## 기술 스택
- Vite 8 + React 19 + Tailwind CSS v4
- Vercel Serverless Functions (api/)
- JSON 파일 저장 (lib/store.js → data/projects.json)

## 제약사항
- Vercel 서버리스 파일시스템은 읽기 전용 → 쓰기(프로젝트 등록/수정/삭제)는 동작하지 않음. 외부 스토리지(Vercel Blob, DB 등) 전환 필요
- 스크린샷 업로드도 동일 이유로 prod에서 미동작

## 향후 개선 포인트
- 외부 스토리지 도입으로 CRUD 완전 동작화
- 커스텀 도메인 연결
- README AI 구조화 (OpenAI API)
