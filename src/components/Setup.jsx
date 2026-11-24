import { useRef } from 'react'
import { parseNames, nameError } from '../lib/names'
import { planGroups, GROUP_SIZES, RECOMMENDED_GROUP_SIZE, MAX_SINGLE_GROUP } from '../lib/groups'
import JoinRoom from './JoinRoom'
import { today, isDay } from '../lib/dates'

// Name entry + options. Calls onGenerate(names) when the form is valid.
// onResume (optional): shown when a saved bracket exists but we're on the home page.
export default function Setup({ state, update, onGenerate, onResume, defaultName }) {
  const { name, date, text, mode, consolation, format, groupSize, advance } = state
  const names = parseNames(text)
  const groupInfo = format === 'groups' ? describeGroups(names.length, groupSize, advance) : null
  const error = nameError(names) || groupInfo?.error || ''

  // Numbers shown beside each name (blank lines get none), kept scrolled with the box
  const PLACEHOLDER = 'Roger\nRafa\nNovak\nSerena'
  const gutter = useRef(null)
  let count = 0
  const numbers = (text || PLACEHOLDER).split('\n').map((line) => (line.trim() ? ++count : null))

  return (
    <section className="setup">
      {onResume && (
        <button className="resume" onClick={onResume}>
          ← Back to your bracket
        </button>
      )}
      <div className="name-date">
        <div>
          <label htmlFor="tournament-name">
            Tournament name <span className="muted">(optional)</span>
          </label>
          <input
            id="tournament-name"
            className="name-input"
            value={name}
            maxLength={80}
            placeholder={defaultName}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="tournament-date">Date</label>
          <input
            id="tournament-date"
            type="date"
            className="name-input"
            value={date || today()}
            onChange={(e) => update({ date: isDay(e.target.value) ? e.target.value : '' })}
          />
        </div>
      </div>

      <label>
        Players <span className="muted">({names.length} / 128, one per line)</span>
      </label>
      <div className="name-editor">
        <div className={`line-numbers${text ? '' : ' placeholder'}`} ref={gutter} aria-hidden="true">
          {numbers.map((n, i) => (
            <div key={i} className={n > 128 ? 'over' : ''}>
              {n}
            </div>
          ))}
        </div>
        <textarea
          rows={12}
          wrap="off"
          value={text}
          placeholder={PLACEHOLDER}
          onChange={(e) => update({ text: e.target.value })}
          onScroll={(e) => (gutter.current.scrollTop = e.target.scrollTop)}
        />
      </div>

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
      </div>

      <div className="options">
        <span className="option-title">Format</span>
        <label>
          <input
            type="radio"
            checked={format === 'knockout'}
            onChange={() => update({ format: 'knockout' })}
          />
          Knockout
        </label>
        <label>
          <input
            type="radio"
            checked={format === 'groups'}
            onChange={() => update({ format: 'groups' })}
          />
          Group stage, then knockout
        </label>

        {format === 'groups' && (
          <div className="group-options">
            <label>
              Group size
              <select
                value={groupSize}
                onChange={(e) =>
                  update({ groupSize: e.target.value === 'all' ? 'all' : Number(e.target.value) })
                }
              >
                {GROUP_SIZES.map((n) => (
                  <option key={n} value={n}>
                    Up to {n} players{n === RECOMMENDED_GROUP_SIZE ? ' (recommended)' : ''}
                  </option>
                ))}
                <option value="all">One group (everyone plays everyone)</option>
              </select>
            </label>
            <label>
              Advancing
              <select
                value={advance}
                onChange={(e) =>
                  update({ advance: e.target.value === 'all' ? 'all' : Number(e.target.value) })
                }
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    Top {n} from each group
                  </option>
                ))}
                <option value="all">Everyone (pool play for seeding)</option>
              </select>
            </label>
            {groupInfo?.summary && names.length >= 2 && <p className="muted">{groupInfo.summary}</p>}
          </div>
        )}
      </div>

      <div className="options">
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

// Plain-English summary of the group setup, or an error if the groups are too small.
function describeGroups(count, size, advance) {
  if (count < 2) return null
  const { groups, sizes, smallest, largest } = planGroups(count, size)
  const pools = advance === 'all'
  if (groups === 1 && count > MAX_SINGLE_GROUP) {
    return {
      error: `One group works for up to ${MAX_SINGLE_GROUP} players (that's already ${(MAX_SINGLE_GROUP * (MAX_SINGLE_GROUP - 1)) / 2} matches). Choose a group size instead.`,
    }
  }
  if (!pools && smallest <= advance) {
    return {
      error: `Each group needs more than ${advance} player${advance > 1 ? 's' : ''}. Choose bigger groups or fewer advancing.`,
    }
  }
  const qualifiers = pools ? count : groups * advance
  const word = pools ? 'pool' : 'group'
  const groupText =
    groups === 1
      ? `1 ${word} of ${count}`
      : smallest === largest
        ? `${groups} ${word}s of ${smallest}`
        : `${groups} ${word}s of ${smallest}–${largest}`
  const matchesEach = smallest === largest ? `${largest - 1}` : `${smallest - 1}–${largest - 1}`
  const after = pools
    ? `Then all ${count} play the Main Draw, seeded by pool results.`
    : qualifiers < 2
      ? 'Best record wins; no knockout.'
      : `Top ${advance} advance to a ${qualifiers}-player Main Draw.`
  return { summary: `${groupText} · each player plays ${matchesEach} matches. ${after}`, sizes }
}
