// Who has won each event so far: the Main Draw (or a pure round robin) and the Consolation.
// Shared by the champion celebration and the host's "confirm the champion" check.
import { BYE, getBrackets } from './bracket'
import { roundRobinChampion } from './groups'

// Each: { key, event, label, name, opponent, score }
export function champions(t, brackets = getBrackets(t)) {
  const { groups, main, consolation } = brackets
  const out = []
  const fromFinal = (key, event, label, rounds) => {
    const final = rounds?.at(-1)?.[0]
    if (!final?.winner || final.winner === BYE) return
    const opponent = final.winner === final.a ? final.b : final.a
    out.push({
      key,
      event,
      label,
      name: final.winner,
      opponent: opponent && opponent !== BYE ? opponent : null,
      // the final's score, written from the champion's side
      score: final.score?.map(([a, b]) => (final.winner === final.b ? `${b}–${a}` : `${a}–${b}`)).join('  '),
    })
  }
  if (main) fromFinal('main', 'Main Draw', 'Champion', main)
  else if (groups) {
    const name = roundRobinChampion(groups, false)
    if (name) out.push({ key: 'main', event: 'Round Robin', label: 'Round Robin Champion', name })
  }
  fromFinal('consolation', 'Consolation', 'Consolation Champion', consolation)
  return out
}

// Champions in `after` that weren't champions in `before` (a new or changed winner)
export function newChampions(before, after) {
  const was = Object.fromEntries(champions(before).map((c) => [c.key, c.name]))
  return champions(after).filter((c) => was[c.key] !== c.name)
}
