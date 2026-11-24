import { BYE } from '../lib/bracket'

// One match: two player buttons. Clickable only when both players are known.
export default function Match({ match, onPick, seedOf }) {
  const { id, a, b, winner } = match
  const playable = a && b && a !== BYE && b !== BYE && !!onPick

  return (
    <div className="match">
      {[a, b].map((p, k) => {
        const real = p && p !== BYE
        const cls = !real ? 'empty' : !winner ? '' : winner === p ? 'won' : 'lost'
        return (
          <button
            key={k}
            className={`player ${cls}`}
            disabled={!playable}
            onClick={() => onPick(id, p)}
            title={real ? p : undefined}
          >
            {real && seedOf(p) && <span className="seed">{seedOf(p)}</span>}
            <span className="name">{p === BYE ? 'BYE' : p || 'TBD'}</span>
          </button>
        )
      })}
    </div>
  )
}
