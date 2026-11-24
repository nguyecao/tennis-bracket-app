import { useEffect, useState } from 'react'

export const DEFAULT_NAME = 'Tennis Tournament'
const MAX_LENGTH = 80
const BASE_TITLE = document.title // e.g. "TENNIS.live" from index.html

// Tournament name + date above the bracket. Falls back to DEFAULT_NAME when no name was given.
// onRename (host only): click the name to edit it in place.
export default function TournamentTitle({ name, created, onRename }) {
  const shown = name?.trim() || DEFAULT_NAME
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // Browser tab: "Spring Club Championship · TENNIS.live"
  useEffect(() => {
    document.title = `${shown} · ${BASE_TITLE}`
    return () => {
      document.title = BASE_TITLE
    }
  }, [shown])

  const date = created
    ? new Date(created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  function save() {
    onRename(draft.trim())
    setEditing(false)
  }

  return (
    <div className="tournament-title">
      {editing ? (
        <input
          className="title-input"
          autoFocus
          value={draft}
          maxLength={MAX_LENGTH}
          placeholder={DEFAULT_NAME}
          aria-label="Tournament name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <h2>
          {shown}
          {onRename && (
            <button
              className="edit-name"
              aria-label="Rename tournament"
              title="Rename tournament"
              onClick={() => {
                setDraft(name || '')
                setEditing(true)
              }}
            >
              ✎
            </button>
          )}
        </h2>
      )}
      {date && <p>{date}</p>}
    </div>
  )
}
