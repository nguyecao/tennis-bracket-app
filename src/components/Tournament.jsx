import { getBrackets } from '../lib/bracket'
import Bracket from './Bracket'

// Main draw + optional consolation. Leave out onPick for a read-only view.
export default function Tournament({ t, onPick }) {
  const { main, consolation } = getBrackets(t)
  const seedOf = (name) => (t.seeds ? t.seeds.indexOf(name) + 1 || null : null)

  return (
    <>
      <Bracket title="Main Draw" rounds={main} onPick={onPick} seedOf={seedOf} />
      {consolation && (
        <Bracket title="Consolation" rounds={consolation} onPick={onPick} seedOf={seedOf} />
      )}
    </>
  )
}
