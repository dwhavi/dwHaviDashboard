# dwHaviDashboard — 세이브포인트

**날짜:** 2026-04-22
**상태:** Phase 1 완료 (백엔드 API + 프론트엔드 API 연동)

## 완료된 단계
- [x] Phase 1: 백엔드 API 구현
- [x] 프론트엔드 API 연동 (App.jsx, ProjectForm.jsx, ProjectModal.jsx)
- [x] Vite dev server API 미들웨어 통합

## 현재 상태
- API 정상 동작 (localhost:5173)
- 8개 프로젝트 데이터 (data/projects.json)
- 카드 그리드 + 카테고리 필터 + 키워드 검색 (API 연동)
- 상세 모달 + 삭제 버튼
- 프로젝트 추가 폼 (실제 API 연동)
- README 불러오기 (GitHub API + 정규식 파싱)
- 스크린샷 업로드 (public/screenshots/)
- 로딩 스켈레톤 UI

## 프로젝트 구조
```
~/projects/dwHaviDashboard/
├── api/
│   ├── projects.js          # GET/POST 프로젝트 목록/생성
│   ├── projects/
│   │   └── [id].js          # GET/PUT/DELETE 단건 CRUD
│   ├── upload.js            # 스크린샷 업로드
│   └── readme.js            # GitHub README fetch + 정규식 파싱
├── lib/
│   └── store.js             # JSON 파일 기반 CRUD 저장소
├── data/
│   └── projects.json        # 프로젝트 데이터 (8개)
├── docs/
│   └── PLAN.md              # 개발 계획 (5단계)
├── src/
│   ├── data/
│   │   └── projects.js       # API 호출 함수들
│   ├── components/
│   │   ├── ProjectCard.jsx   # 카드 컴포넌트
│   │   ├── ProjectModal.jsx  # 상세 모달 (삭제 버튼 추가)
│   │   └── ProjectForm.jsx   # 프로젝트 추가 폼 (실제 API)
│   ├── App.jsx               # 메인 레이아웃 (API 연동)
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── public/
│   └── screenshots/          # 스크린샷 저장 디렉토리
├── vite.config.js            # Vite + API dev server 미들웨어
├── package.json
├── index.html
└── SAVEPOINT.md
```

## 기술 스택
- Vite 8 + React 19 + Tailwind CSS v4
- 배포: Vercel (Serverless Functions)
- 데이터 저장: JSON 파일 (초기) → Vercel KV/Blob (향후 전환)
- README 구조화: 정규식 파싱 (향후 OpenAI API 확장 포인트)

## 다음 단계 (Phase 2)
- [ ] 에러 처리 및 로딩 상태 UI 고도화
- [ ] 프로젝트 수정 기능 (ProjectForm 재활용)
- [ ] 검색 debounce 최적화
- [ ] 빈 상태 UI 개선

## 다음 단계 (Phase 3)
- [ ] 상태 필터 (Active / Development / Archived)

## 다음 단계 (Phase 4)
- [ ] 모바일 반응형 최적화
- [ ] 카드 애니메이션/트랜지션 다듬기

## 다음 단계 (Phase 5)
- [ ] Vercel 프로젝트 연동 + 배포
- [ ] 환경변수 설정 (OPENAI_API_KEY)
- [ ] 커스텀 도메인 연결

## 환경변수 (향후 설정)
- OPENAI_API_KEY — AI 구조화용 (서버리스 전용)
- BLOB_READ_WRITE_TOKEN — Vercel Blob (필요시)

## 알려진 이슈
- README 파싱이 정규식 기반이므로 README 형식에 따라 정확도 차이 있음
- 스크린샷 업로드는 public/ 디렉토리 기반 (Vercel 배포 시 Blob 전환 필요)
- 검색에 debounce 없음 (소규모 데이터에서는 문제없음)
