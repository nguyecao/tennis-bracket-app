// Match alerts for highlighted (★) players: what to say when one of their matches finishes.
import { BYE, roundName } from './bracket'
import { groupWord, roundRobinChampion } from './groups'

// Every decided match (no byes): match id -> winner's name
export function decidedMatches({ all }) {
  const out = {}
  for (const m of all) {
    if (!m.winner || m.winner === BYE || !m.a || !m.b || m.a === BYE || m.b === BYE) continue
    out[m.id] = m.winner
  }
  return out
}

// A score from one player's side: "6–4 7–5"
function scoreFor(m, player) {
  if (!m.score?.length) return ''
  const mine = player === m.a
  return m.score.map(([a, b]) => (mine ? `${a}–${b}` : `${b}–${a}`)).join(' ')
}

// The alerts for one finished match: one per highlighted player in it.
// Each: { matchId, kind: 'win' | 'loss', name, verb, opponent, score, next, tab, champion }
// champion: this win crowned them (the champion celebration already says so)
export function alertsFor(matchId, t, brackets, followed) {
  const { groups, main, consolation } = brackets
  const m = brackets.all.find((x) => x.id === matchId)
  if (!m?.winner) return []
  const loser = m.winner === m.a ? m.b : m.a
  const out = []

  // Where this match sits, and what each result means
  let winNext = ''
  let loseNext = ''
  let tab = 'main'
  let champion = false
  const g = /^g(\d+)-/.exec(matchId)
  if (g) {
    const group = groups[+g[1]]
    const label = `${groupWord(t.advance)} ${group.name}`
    const record = (name) => {
      const r = group.table.find((x) => x.name === name)
      return r ? `${r.w}–${r.l} in ${label}` : label
    }
    winNext = record(m.winner)
    loseNext = record(loser)
    tab = 'groups'
    champion = roundRobinChampion(groups, !!main) === m.winner
  } else {
    const isMain = matchId.startsWith('m')
    const rounds = isMain ? main : consolation
    const r = +/^[mc](\d+)-/.exec(matchId)[1]
    const prefix = isMain ? '' : 'Consolation '
    const last = r === rounds.length - 1
    champion = last
    winNext = last ? `wins the ${isMain ? 'Main Draw' : 'Consolation'} 🏆` : `into the ${prefix}${roundName(rounds[r + 1].length)}`
    // First-match losers in the Main Draw go on to the Consolation
    const toConsolation =
      isMain && consolation?.[0]?.some((c) => c.a === loser || c.b === loser)
    loseNext = toConsolation
      ? 'moves to the Consolation'
      : last
        ? `${prefix}runner-up`
        : `out in the ${prefix}${roundName(rounds[r].length)}`
  }

  if (followed.has(m.winner)) {
    out.push({ kind: 'win', name: m.winner, verb: g ? 'beat' : 'def.', opponent: loser, score: scoreFor(m, m.winner), next: winNext, matchId, tab, champion })
  }
  if (followed.has(loser)) {
    out.push({ kind: 'loss', name: loser, verb: 'to', opponent: m.winner, score: scoreFor(m, loser), next: loseNext, matchId, tab })
  }
  return out
}
