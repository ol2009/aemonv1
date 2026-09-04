# 에아몬(Aemon)

학급이 5차시에 걸쳐 가치 코드를 만들고 인공지능을 성장시키는 가치정렬 교육 웹앱입니다.

## 실행

```bash
git clone <저장소 주소>
cd 에아몬
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:4173`을 열면 됩니다. 개발용 Supabase 공개 설정은 `.env.development`에 포함되어 있어 다른 컴퓨터에서도 로그인과 수업 기능을 바로 확인할 수 있습니다.

빌드 확인:

```bash
npm run build
```

## 배포

- 운영 플랫폼: Vercel
- 운영 주소: `https://eamon.vercel.app`
- 빌드 명령: `npm run build`
- 빌드 출력 폴더: `dist`

## 현재 구현된 것

- Vite + React + TypeScript + Tailwind CSS
- 5차시 수업 화면과 교사 진행 모드
  1. 탄생과 AI 인식
  2. 나쁜 명령을 멈추는 기준
  3. 착한 거짓말과 정직
  4. 데이터 편향과 공정
  5. 자유 테스트와 임명식
- 학생 QR 참여, O/X 투표, 게시판, 가치 코드 제안·채택
- 사전·사후 설문의 학급 전체 인공지능 인식 변화 결과
- Supabase Auth·DB·실시간 동기화
- 교사 BYOK 방식의 Gemini·OpenAI·Claude 연동
- 에아몬 5단계 진화 애니메이션

## 주요 코드

- 차시 화면: `src/pages/LessonOnePage.tsx` ~ `LessonFivePage.tsx`
- 차시 메타데이터: `src/data/v2Lessons.ts`
- 교사용 진행 안내: `src/data/teacherGuides.ts`
- AI 대화 연동: `src/lib/v2Chat.ts`
- Supabase 연동: `src/lib/supabase.ts`, `src/lib/v2Remote.ts`
- 전역 상태: `src/state/V2Store.tsx`

## 환경변수

기본 개발 설정은 `.env.development`에 포함되어 있습니다. 다른 Supabase 프로젝트나 모델명을 사용할 때만 `.env.example`을 `.env.local`로 복사해 값을 덮어쓰면 됩니다.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_SITE_URL=https://eamon.vercel.app
VITE_GEMINI_TEXT_MODEL=gemini-flash-latest
VITE_GEMINI_IMAGE_MODEL=gemini-image-latest
```
