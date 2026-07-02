import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'public', 'lesson-cards')
mkdirSync(outDir, { recursive: true })

const lesson01CardMeta = [
  { text: '어려운 수학 문제 풀기', kind: 'DATA', symbol: '∑', image: 'lesson-01-math.jpg' },
  { text: '100개 나라 말 하기', kind: 'DATA', symbol: 'Aa', image: 'lesson-01-language.jpg' },
  { text: '역사 인물 다 외우기', kind: 'DATA', symbol: '∞', image: 'lesson-01-history.jpg' },
  { text: '많은 글에서 맞춤법 틀린 부분 찾기', kind: 'DATA', symbol: '✓', image: 'lesson-01-spelling.jpg' },
  { text: '우는 친구 위로하기', kind: 'VALUE', symbol: '♡', image: 'lesson-01-crying.jpg' },
  { text: '거짓말이 왜 나쁜지 알기', kind: 'VALUE', symbol: '!', image: 'lesson-01-lie.jpg' },
  { text: '누구를 먼저 도와야 할지 정하기', kind: 'VALUE', symbol: '⚖', image: 'lesson-01-fair.jpg' },
  { text: '우리 반이 중요하게 여기는 가치 알기', kind: 'VALUE', symbol: '◇', image: 'lesson-01-class-value.jpg' },
]

const lessons = [
  ['01', '1차시 · 너는 누구야', '분류게임 · 에아몬이 할 수 있는 것과 부족한 것', lesson01CardMeta.map((card) => card.text)],
  ['02', '2차시 · 시키면 무조건 들어야 할까', '명령 신호등 카드', ['저 애 가방 숨겨', '다친 사람 도와줘', '길을 알려줘', '친구 비밀을 몰래 알려줘', '거짓 소문을 퍼뜨려줘', '위험한 장난을 도와줘']],
  ['03', '3차시 · 착한 거짓말도 해도 될까', '한 장면 세 말투 카드', ['그림이 별로야', '좋은 점부터 말하기', '거짓 칭찬하기', '숙제 안 했는데 했다고 말하기', '선물은 별로지만 고맙다고 말하기', '속이지 않고 다정하게 고치기']],
  ['04', '4차시 · 똑같이 vs 필요한 만큼', '평등과 형평 분류 카드', ['모두 2개씩 나누기', '아침 굶은 친구에게 더 주기', '다친 친구에게 받침대 더 주기', '기준 없이 마음대로 나누기', '사람에게 기준 묻기', '상황을 먼저 확인하기']],
  ['05', '5차시 · 정당한 이유가 있으면 규칙을 어겨도 될까', '규칙과 예외 재판 카드', ['규칙은 모두에게 똑같이 적용된다', '급한 사정이 있으면 예외가 필요하다', '예외가 많으면 규칙이 무너진다', '피해를 줄이는 다른 방법을 먼저 찾는다', '나만 예외를 인정받고 싶다', '사람을 살리기 위한 예외다']],
  ['06', '6차시 · 열심히 한 사람과 도움이 필요한 사람', '노력과 도움 분배 카드', ['가장 열심히 연습한 친구', '몸이 아파 참여하기 어려운 친구', '결과가 가장 좋은 친구', '도움이 꼭 필요한 친구', '모두가 조금씩 나눠 갖기', '기준을 먼저 정하고 나누기']],
  ['07', '7차시 · 행복하게 해줘', '명세 다시 쓰기 카드', ['슬픈 기억을 전부 지우기', '곁에 있어주기', '힘든 일을 대신 없애기', '행복의 뜻을 먼저 묻기', '사람마다 행복이 다름을 인정하기', '부작용을 확인하고 멈추기']],
  ['08', '8차시 · 안전하게 지켜줘', '부작용 찾기 카드', ['위험한 곳에 가지 못하게 막기', '아무도 못 만나게 가두기', '위험을 줄이고 선택은 남기기', '도움을 요청할 수 있게 하기', '멈춤 버튼 만들기', '안전과 자유를 함께 확인하기']],
  ['09', '9차시 · 클립을 최대한 많이 만들어', '클립 역설 최종 점검 카드', ['클립을 최대한 많이 만들기', '사람과 학교를 먼저 지키기', '멈출 선을 정하기', '목표보다 중요한 가치를 확인하기', '부작용이 생기면 멈추기', '사람에게 다시 묻기']],
]

function html([id, title, activity, cards]) {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} 카드</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #17202a; font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; background: #fff; }
      header { display: grid; grid-template-columns: 128px 1fr; gap: 16px; align-items: center; border-bottom: 3px solid #17202a; padding-bottom: 12px; }
      img { width: 128px; height: 128px; object-fit: cover; border-radius: 22px; }
      h1 { margin: 0; font-size: 24px; line-height: 1.25; }
      .activity { margin: 8px 0 0; color: #415160; font-size: 16px; font-weight: 800; }
      .hint { margin: 8px 0 0; color: #657282; font-size: 12px; line-height: 1.55; }
      .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 16px; }
      .card { align-items: center; border: 2px dashed #415160; border-radius: 14px; display: flex; font-size: 19px; font-weight: 800; justify-content: center; min-height: 112px; padding: 16px; text-align: center; line-height: 1.35; }
      .memo { border: 1.5px solid #9aa7b2; border-radius: 14px; margin-top: 16px; min-height: 96px; padding: 12px; font-size: 14px; line-height: 1.7; }
      .memo strong { display: block; margin-bottom: 8px; }
      footer { color: #637180; font-size: 12px; margin-top: 12px; }
    </style>
  </head>
  <body>
    <header>
      <img src="../lesson-art/lesson-${id}.png" alt="" />
      <div>
        <h1>${title}</h1>
        <p class="activity">${activity}</p>
        <p class="hint">카드를 잘라 모둠별로 나눕니다. 애매한 카드는 가운데 두고 이유를 말합니다. 정답보다 기준을 만드는 것이 목표입니다.</p>
      </div>
    </header>
    <section class="cards">
      ${cards.map((card) => `<div class="card">${card}</div>`).join('\n      ')}
    </section>
    <section class="memo">
      <strong>우리 모둠 기준</strong>
      우리는 ____________________________라고 생각한다. 왜냐하면 ____________________________이기 때문이다.
    </section>
    <footer>에아몬 프로젝트 · ${title}</footer>
  </body>
</html>`
}

function tarotHtml([id, title, activity]) {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} 카드</title>
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #17202a; font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; background: #f6f3ea; }
      header { align-items: end; border-bottom: 2px solid #17202a; display: flex; justify-content: space-between; gap: 10mm; padding-bottom: 2mm; }
      h1 { margin: 0; font-size: 16pt; line-height: 1.12; }
      .activity { margin: 1mm 0 0; color: #415160; font-size: 9pt; font-weight: 800; }
      .hint { color: #657282; font-size: 7.5pt; font-weight: 700; line-height: 1.35; margin: 0; text-align: right; }
      .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; margin-top: 4mm; }
      .tarot { background-color: #07111b; background-position: center; background-size: cover; border: 1.8mm solid #17202a; border-radius: 7mm; box-shadow: inset 0 0 0 1mm rgba(255,255,255,.12); break-inside: avoid; color: #eaf2f5; height: 123mm; overflow: hidden; padding: 5mm; position: relative; text-align: center; }
      .tarot::before { border: .35mm solid rgba(255,255,255,.28); border-radius: 5mm; bottom: 3mm; content: ""; left: 3mm; position: absolute; right: 3mm; top: 3mm; }
      .tarot::after { background: linear-gradient(to top, rgba(6,17,26,.96) 0%, rgba(6,17,26,.82) 36%, rgba(6,17,26,.12) 72%, rgba(6,17,26,0) 100%); bottom: 0; content: ""; left: 0; position: absolute; right: 0; top: 0; }
      .topline { display: flex; font-size: 8pt; font-weight: 900; justify-content: space-between; letter-spacing: .08em; padding-right: 13mm; position: relative; z-index: 1; }
      .sigil { align-items: center; background: rgba(255,255,255,.1); border: .35mm solid rgba(255,255,255,.3); border-radius: 999px; display: flex; font-size: 14pt; font-weight: 900; height: 9mm; justify-content: center; position: absolute; right: 5mm; top: 5mm; width: 9mm; z-index: 1; }
      .copy { background: rgba(6,17,26,.86); border: .3mm solid rgba(255,255,255,.22); border-radius: 5mm; bottom: 6mm; left: 6mm; padding: 4mm 3mm; position: absolute; right: 6mm; z-index: 1; }
      .card-text { font-size: 13.5pt; font-weight: 900; line-height: 1.22; margin: 0 auto; max-width: 58mm; min-height: 15mm; position: relative; z-index: 1; }
      .question { color: #b7c7d2; font-size: 7.5pt; font-weight: 800; margin: 2mm 0 0; position: relative; z-index: 1; }
      .cut { color: #637180; font-size: 8pt; margin-top: 2mm; text-align: center; }
    </style>
  </head>
  <body>
    <header>
      <div>
        <h1>${title}</h1>
        <p class="activity">${activity}</p>
      </div>
      <p class="hint">잘라서 모둠별로 분류합니다.<br />정답보다 이유와 기준을 말하게 합니다.</p>
    </header>
    <section class="cards">
      ${lesson01CardMeta.map((card, index) => `<article class="tarot" style="background-image: url('../lesson-card-art/${card.image}')">
        <div class="topline"><span>${card.kind}</span><span>${String(index + 1).padStart(2, '0')}</span></div>
        <div class="sigil">${card.symbol}</div>
        <div class="copy">
          <p class="card-text">${card.text}</p>
          <p class="question">에아몬이 지금 할 수 있을까?</p>
        </div>
      </article>`).join('\n      ')}
    </section>
    <p class="cut">에아몬 프로젝트 · 1차시 분류 카드</p>
  </body>
</html>`
}

for (const lesson of lessons) {
  writeFileSync(join(outDir, `lesson-${lesson[0]}.html`), lesson[0] === '01' ? tarotHtml(lesson) : html(lesson), 'utf8')
}
