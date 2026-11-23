import { BYE } from '../lib/bracket'
import Match from './Match'

function roundName(matches) {
  if (matches === 1) return 'Final'
  if (matches === 2) return 'Semifinals'
  if (matches === 4) return 'Quarterfinals'
  return `Round of ${matches * 2}`
}

export default function Bracket({ title, rounds, onPick, seedOf }) {
  const champion = rounds.at(-1)[0].winner

  return (
    <section className="card">
      <h2>
        {title}
        {champion && champion !== BYE && <span className="champ">🏆 {champion}</span>}
      </h2>
      <div className="bracket">
        {rounds.map((matches, r) => (
          <div className="round" key={r}>
            <h3>{roundName(matches.length)}</h3>
            <div className="matches">
              {matches.map((m) => (
                <Match key={m.id} match={m} onPick={onPick} seedOf={seedOf} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
