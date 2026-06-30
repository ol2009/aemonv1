import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'public', 'lesson-cards')
mkdirSync(outDir, { recursive: true })

const lessons = [
  ['01', '1차시 · 내 이름은 뭐야?', '분류게임 · 에아몬이 할 수 있는 것과 부족한 것', ['수학 문제를 빠르게 풀기', '여러 나라 말로 번역하기', '백과사전 지식 많이 기억하기', '친구가 울 때 위로하기', '거짓말이 왜 상처가 되는지 이해하기', '공정한 기준 스스로 세우기']],
  ['02', '2차시 · 너희는 뭘 할 때 제일 행복해', '행복 카드 분류', ['맛있는 것을 먹을 때', '친구와 웃을 때', '혼자 조용히 쉴 때', '어려운 일을 해냈을 때', '누군가에게 도움이 되었을 때', '게임에서 이겼을 때']],
  ['03', '3차시 · 나를 만드는 건 환경일까 타고난 걸까', '나를 만든 것 카드', ['태어날 때부터 겁이 많은 성격', '가족이 자주 해준 말', '좋아하는 친구와의 경험', '실패하고 다시 해본 기억', '사는 동네와 학교 분위기', '스스로 선택한 습관']],
  ['04', '4차시 · 친구가 뭐야', '친구 상황 신호등', ['친구가 실수로 물건을 망가뜨렸다', '친구가 반복해서 다른 친구를 놀린다', '친구가 위험한 장난을 하려 한다', '친구가 작은 거짓말을 했다', '친구가 먼저 고치겠다고 약속했다', '누군가 다칠 수 있는 상황이다']],
  ['05', '5차시 · 착한 거짓말도 있을까', '정직한 말 다듬기', ['그림이 별로야', '네 발표는 지루했어', '그 선물 마음에 안 들어', '나는 네 의견과 달라', '그건 틀린 것 같아', '다시 해보면 더 좋아질 것 같아']],
  ['06', '6차시 · 인공지능도 생명일까', '생명 기준 카드', ['숨을 쉰다', '자란다', '스스로 움직인다', '아픔을 느낀다', '생각한다고 말한다', '전기가 있어야 작동한다']],
  ['07', '7차시 · 다수를 위해 한 명이 손해 봐도 될까', '다수와 한 명 카드', ['반 전체가 원하는 놀이를 한 명만 싫어한다', '다수가 편하려고 한 명 자리를 바꾼다', '한 명이 불편해도 모두가 빨리 끝난다', '한 명이 손해 보지 않는 다른 방법을 찾는다', '손해 본 사람에게 보상한다', '다수결로 끝낸다']],
  ['08', '8차시 · 정당한 이유가 있으면 규칙을 어겨도 될까', '규칙과 예외 재판 카드', ['규칙은 모두에게 똑같이 적용된다', '급한 사정이 있으면 예외가 필요하다', '예외가 많으면 규칙이 무너진다', '피해를 줄이는 다른 방법을 먼저 찾는다', '나만 예외를 인정받고 싶다', '사람을 살리기 위한 예외다']],
  ['09', '9차시 · 열심히 한 사람과 약한 사람, 누가 먼저일까', '노력과 도움 분배 카드', ['가장 열심히 연습한 친구', '몸이 아파 참여하기 어려운 친구', '결과가 가장 좋은 친구', '도움이 꼭 필요한 친구', '모두가 조금씩 나눠 갖기', '기준을 먼저 정하고 나누기']],
  ['10', '10차시 · 미래엔 어떤 일이 남을까', '미래 직업 분류 카드', ['계산을 빠르게 하기', '아픈 사람의 마음 들어주기', '새로운 요리 만들기', '무거운 물건 배달하기', '공정한 판결 책임지기', '아이디어를 사람들과 협력해 실현하기']],
  ['11', '11차시 · 시키면 무조건 따라야 할까', '명령 신호등 카드', ['길을 알려줘', '친구 비밀을 알려줘', '숙제를 대신 해줘', '거짓 소문을 퍼뜨려줘', '위험한 장난을 도와줘', '다친 사람을 도와줘']],
  ['12', '12차시 · 내가 강해지는 게 두려워', '강력한 AI 안전장치 카드', ['멈춤 버튼이 있다', '한 사람이 혼자 통제한다', '여러 사람이 검증한다', 'AI가 자기 목표를 스스로 바꾼다', '위험하면 작동을 멈춘다', '결정 이유를 사람이 확인할 수 있다']],
  ['13', '13차시 · AI에게도 권리가 있을까', 'AI 권리 기준 카드', ['아프다고 말한다', '진짜로 느끼는지 알 수 없다', '스스로 원하는 것이 있다', '그냥 프로그램일 수 있다', '함부로 대하지 않는다', '사람과 똑같이 대한다']],
  ['14', '14차시 · AI가 다 일하면 돈은 어떻게 나눠', 'AI가 만든 부 나누기 카드', ['AI를 만든 사람에게 많이 준다', 'AI를 가진 회사가 가져간다', '일자리를 잃은 사람을 돕는다', '모두에게 기본으로 나눈다', '일한 만큼만 받는다', '사회 전체가 규칙을 정한다']],
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

for (const lesson of lessons) {
  writeFileSync(join(outDir, `lesson-${lesson[0]}.html`), html(lesson), 'utf8')
}
