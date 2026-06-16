/**
 * Mixed true/false questions for the Thumbs Up / Thumbs Down quiz.
 *
 * Each question is shown (`show`) AND spoken (`say`), with a boolean answer
 * (true = thumbs up). The pool grows with difficulty: easy = counting /
 * recognition / colours / shapes; medium adds comparison; hard adds number facts.
 */
export interface Quiz { show: string; say: string; answer: boolean }

const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const coin = () => Math.random() < 0.5
const SHAPES = [{ n: 'circle', e: '🔵' }, { n: 'triangle', e: '🔺' }, { n: 'square', e: '🟦' }, { n: 'star', e: '⭐' }]
const COLOURS = [{ n: 'red', e: '🔴' }, { n: 'blue', e: '🔵' }, { n: 'green', e: '🟢' }, { n: 'yellow', e: '🟡' }, { n: 'purple', e: '🟣' }]

function counting(max: number): Quiz {
  const n = rint(1, max)
  const claim = coin() ? n : Math.max(1, n + (coin() ? 1 : -1))
  return { show: `${'🍎'.repeat(n)}  = ${claim}?`, say: `Are there ${claim} apples?`, answer: claim === n }
}
function recognition(max: number): Quiz {
  const d = rint(1, max)
  const claim = coin() ? d : Math.max(1, Math.min(max, d + (coin() ? 1 : -1)))
  return { show: `${d}`, say: `Is this number ${claim}?`, answer: claim === d }
}
function colour(): Quiz {
  const c = COLOURS[rint(0, COLOURS.length - 1)]
  const claim = coin() ? c : COLOURS[rint(0, COLOURS.length - 1)]
  return { show: `${c.e}  = ${claim.n}?`, say: `Is this ${claim.n}?`, answer: claim.n === c.n }
}
function shape(): Quiz {
  const s = SHAPES[rint(0, SHAPES.length - 1)]
  const claim = coin() ? s : SHAPES[rint(0, SHAPES.length - 1)]
  return { show: `${s.e}  = ${claim.n}?`, say: `Is this a ${claim.n}?`, answer: claim.n === s.n }
}
function comparison(max: number): Quiz {
  let a = rint(1, max), b = rint(1, max)
  while (a === b) b = rint(1, max)
  return { show: `${a}  >  ${b}?`, say: `Is ${a} bigger than ${b}?`, answer: a > b }
}
function fact(max: number): Quiz {
  const minus = coin()
  let a = rint(1, max), b = rint(1, max)
  if (minus && b > a) [a, b] = [b, a]
  const real = minus ? a - b : a + b
  const shown = coin() ? real : Math.max(0, real + (coin() ? 1 : -1))
  const op = minus ? '−' : '+'
  return { show: `${a} ${op} ${b} = ${shown}?`, say: `${a} ${minus ? 'minus' : 'plus'} ${b} equals ${shown}?`, answer: shown === real }
}

export function makeQuiz(difficulty: 1 | 2 | 3): Quiz {
  const easy = [() => counting(5), () => recognition(5), colour, shape]
  const pool = difficulty === 1 ? easy
    : difficulty === 2 ? [...easy, () => counting(10), () => comparison(10)]
    : [() => comparison(10), () => fact(5), () => fact(10), () => recognition(10)]
  return pool[rint(0, pool.length - 1)]()
}
