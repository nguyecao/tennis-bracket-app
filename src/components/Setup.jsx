import { parseNames, nameError } from '../lib/names'
import JoinRoom from './JoinRoom'

// Name entry + options. Calls onGenerate(names) when the form is valid.
// onResume (optional): shown when a saved bracket exists but we're on the home page.
export default function Setup({ state, update, onGenerate, onResume }) {
  const { text, mode, consolation } = state
  const names = parseNames(text)
  const error = nameError(names)

  return (
    <section className="setup">
      {onResume && (
        <button className="resume" onClick={onResume}>
          ← Back to your bracket
        </button>
      )}
      <label>
        Players <span className="muted">({names.length} / 128, one per line)</span>
      </label>
      <textarea
        rows={12}
        value={text}
        placeholder={'Roger\nRafa\nNovak\nSerena'}
        onChange={(e) => update({ text: e.target.value })}
      />

      <div className="options">
        <label>
          <input
            type="radio"
            checked={mode === 'shuffle'}
            onChange={() => update({ mode: 'shuffle' })}
          />
          Shuffle players
        </label>
        <label>
          <input type="radio" checked={mode === 'rank'} onChange={() => update({ mode: 'rank' })} />
          Rank by list order (1st line = top seed)
        </label>
        <label>
          <input
            type="checkbox"
            checked={consolation}
            onChange={(e) => update({ consolation: e.target.checked })}
          />
          Include consolation bracket
        </label>
      </div>

      {error && text.trim() && <p className="error">{error}</p>}
      <button className="primary big" disabled={!!error} onClick={() => onGenerate(names)}>
        Generate bracket
      </button>

      <JoinRoom />
    </section>
  )
}
