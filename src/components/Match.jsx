import { BYE } from '../lib/bracket'

// One match: two player buttons. Clickable only when both players are known.
// labels (optional): text for empty spots, e.g. "Group A · 1st" in a Main Draw fed by groups.
// arriving (optional): [top, bottom] — true for a player who just advanced into this match.
// followed (optional): Set of highlighted players.
// onScore (optional, host with scoring on): opens the score editor for this match.
export default function Match({ match, onPick, seedOf, labels, arriving, followed, onScore }) {
  const { id, a, b, winner, score } = match
  const playable = a && b && a !== BYE && b !== BYE && !!onPick

  return (
    <div className={`match${score ? ' scored' : ''}`} data-match={id}>
      {[a, b].map((p, k) => {
        const real = p && p !== BYE
        const cls = !real ? 'empty' : !winner ? '' : winner === p ? 'won' : 'lost'
        return (
          <button
            key={k}
            className={`player ${cls}${real && arriving?.[k] ? ' arrive' : ''}${real && followed?.has(p) ? ' followed' : ''}`}
            disabled={!playable}
            onClick={() => onPick(id, p)}
            title={real ? p : undefined}
          >
            {real && seedOf(p) && <span className="seed">{seedOf(p)}</span>}
            <span className="name">{p === BYE ? 'BYE' : p || labels?.[k] || 'TBD'}</span>
            {score && (
              // Set scores, scoreboard style; the set winner's number is bold
              <span className="sets">
                {score.map((set, i) => (
                  <span key={i} className={set[k] > set[1 - k] ? 'set-won' : ''}>
                    {set[k]}
                  </span>
                ))}
              </span>
            )}
          </button>
        )
      })}
      {onScore && playable && (
        <button className="score-bar" onClick={() => onScore(match)}>
          {score ? 'Edit score' : '+ Add score'}
        </button>
      )}
    </div>
  )
}
