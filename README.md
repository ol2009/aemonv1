# 에아몬(Aemon)

학급이 함께 키우는 가치정렬 AI 웹앱 MVP 뼈대입니다.

## 실행

```bash
npm install
npm run dev
```

빌드 확인:

```bash
npm run build
```

## 현재 구현된 것

- Vite + React + TypeScript + Tailwind CSS
- PRD 기반 화면 라우트
  - `/` 소개
  - `/guide` 교사 가이드
  - `/login` 임시 로그인
  - `/intro` 연구소 인트로
  - `/home` 에아몬 홈
  - `/talk` 오늘의 대화
  - `/evolution` 진화 연출
  - `/graduation` 졸업 엔딩
  - `/dex` 도감
  - `/settings` 교사 설정
- 기본 모드 대화 루프
  - 시드 에피소드
  - 선택지
  - 빗나가기 되받기
  - 선/악/회색 판정
  - 교사 오버라이드
  - XP/게이지 분리
  - 진화 트리거
- 비채점 상호작용
  - 놀아주기: 데이터의 바다 산책
  - 오염 데이터 청소: 정화
  - 친밀도 축
  - 직전 에피소드 반영 idle 혼잣말
- localStorage 기반 데모 저장
- Supabase와 AI 연결 지점

## 연결 지점

Supabase 클라이언트:

```text
src/lib/supabase.ts
```

AI/BYOK 서버 함수 연결 자리:

```text
src/lib/ai.ts
```

도메인 상태:

```text
src/state/AemonStore.tsx
```

시드 에피소드:

```text
src/data/episodes.ts
```

산책/정화 아이템:

```text
src/data/walkItems.ts
```

Supabase 스키마 초안:

```text
supabase/schema.sql
```

PRD 통합용 부록:

```text
docs/PRD_ADDENDUM_INTERACTIONS.md
```

## 환경변수

`.env.example`을 `.env.local`로 복사해서 채우면 됩니다.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_TEXT_MODEL=gemini-flash-latest
VITE_GEMINI_IMAGE_MODEL=gemini-image-latest
```

## 다음 연결 순서 추천

1. Supabase Auth 연결
2. `classes`, `aemons`, `episode_logs`, `dex` 저장소를 localStorage에서 Supabase로 교체
3. 기본 모드 시드 에피소드 DB 선적재
4. AI 모드를 Vercel Function 또는 Supabase Edge Function으로 연결
5. 진화 이미지 생성 후 R2/Supabase Storage URL 저장
