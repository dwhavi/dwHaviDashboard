# dwHaviDashboard 개발 계획

## 개요
vercel-dashboard를 대체하는 포트폴리오 + 개발물 쇼케이스 대시보드.

## 기술 스택
- Vite 8 + React 19 + Tailwind CSS v4
- Vercel 배포 (Serverless Functions)
- Vercel Blob (스크린샷 저장)
- OpenAI API (README AI 구조화, 서버리스에서만 호출)

## 데이터 모델

```js
{
  id: string,
  name: string,
  category: "web" | "mobile" | "ai" | "devops" | "tool",
  status: "active" | "development" | "archived",
  summary: string,
  description: string,
  architecture: string,
  techStack: string[],
  goals: string[],
  features: string[],
  githubUrl: string,
  serviceUrl: string | null,
  screenshot: string,          // Vercel Blob URL
  tags: string[],
  version: string,
  license: string,
  createdAt: string,
  updatedAt: string,
}
```

## 개발 단계

### Phase 1: 백엔드 API
- [ ] Vercel 프로젝트 생성 및 GitHub 연동
- [ ] `api/projects.js` — GET /api/projects (프로젝트 목록)
- [ ] `api/projects.js` — POST /api/projects (프로젝트 생성)
- [ ] `api/projects/[id].js` — GET /api/projects/:id (단건 조회)
- [ ] `api/projects/[id].js` — PUT /api/projects/:id (수정)
- [ ] `api/projects/[id].js` — DELETE /api/projects/:id (삭제)
- [ ] `api/upload.js` — POST /api/upload (스크린샷 → Vercel Blob)
- [ ] `api/readme.js` — POST /api/readme (GitHub README fetch + AI 구조화)
- [ ] 데이터 저장: Vercel KV 또는 JSON 파일 (초기엔 JSON, 이후 KV 전환 검토)

### Phase 2: 프론트엔드 리팩토링
- [ ] 더미 데이터 → API 호출로 전환
- [ ] ProjectForm 실제 동작 구현
  - [ ] GitHub URL 입력 → README 자동 fetch
  - [ ] AI 구조화 결과 폼에 자동 채우기 + 사용자 수정
  - [ ] 스크린샷 업로드 → Vercel Blob
- [ ] 프로젝트 수정/삭제 기능
- [ ] 에러 처리 및 로딩 상태 UI

### Phase 3: 검색 & 필터 고도화
- [ ] 카테고리 필터 (구현 완료, API 연동 필요)
- [ ] 키워드 검색 API 연동 (이름, 요약, 기술스택, 태그)
- [ ] 상태 필터 (Active / Development / Archived)

### Phase 4: 디자인 & UX
- [ ] 모바일 반응형 최적화
- [ ] 카드 애니메이션/트랜지션 다듬기
- [ ] 빈 상태 UI (프로젝트 없음, 검색 결과 없음)
- [ ] 로딩 스켈레톤

### Phase 5: 배포 & 마무리
- [ ] Vercel 환경변수 설정 (OPENAI_API_KEY 등)
- [ ] Vercel 배포 테스트
- [ ] 커스텀 도메인 연결 (선택)
- [ ] AGENTS.md 작성

## API 엔드포인트 요약

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/projects | 프로젝트 목록 (?category=&q=&status=) |
| POST | /api/projects | 프로젝트 생성 |
| GET | /api/projects/:id | 단건 조회 |
| PUT | /api/projects/:id | 프로젝트 수정 |
| DELETE | /api/projects/:id | 프로젝트 삭제 |
| POST | /api/upload | 스크린샷 업로드 (multipart) |
| POST | /api/readme | GitHub README fetch + AI 구조화 |

## 환경변수 (서버리스 전용)
- OPENAI_API_KEY — README AI 구조화
- BLOB_READ_WRITE_TOKEN — Vercel Blob 스크린샷 저장 (필요시)

## 우선순위
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
