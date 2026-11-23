import { BYE } from '../lib/bracket'
import Match from './Match'

function roundName(matches) {
  if (matches === 1) return 'Final'
  if (matches === 2) return 'Semifinals'
  if (matches === 4) return 'Quarterfinals'
  return `Round of ${matches * 2}`
}

// Each match sits in a "slot" that takes an equal share of the column's height, so a
// match always lines up halfway between the two matches that feed it. The connector
// lines are drawn in CSS (see "Bracket lines" in App.css).
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
              {matches.map((m) => {
                // Highlight the connector lines once a winner has moved along them
                const decided = m.winner && m.winner !== BYE
                const filled = r > 0 && m.a != null && m.b != null
                return (
                  <div
                    key={m.id}
                    className={`slot${decided ? ' decided' : ''}${filled ? ' filled' : ''}`}
                  >
                    <Match match={m} onPick={onPick} seedOf={seedOf} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
