import { useEffect, useState } from 'react'
import { formatDay, dayFromTimestamp, isDay } from '../lib/dates'

export const DEFAULT_NAME = 'Tennis Tournament'
const MAX_LENGTH = 80
const BASE_TITLE = document.title // e.g. "TENNIS.live" from index.html

// Tournament name + date above the bracket. With no name given it shows defaultName
// (the theme's name, e.g. "Wimbledon"), or DEFAULT_NAME on the Classic theme.
// onRename / onRedate (host only): click the name or the date to change it in place.
// Pencil icon with its tip at the bottom left, pointing back at the text it edits.
// (The ✎ character points the other way in many fonts.)
function PencilIcon() {
  return (
    <svg className="pencil" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 3.5l5 5L8 21H3v-5z" />
      <path d="M13 6l5 5" />
    </svg>
  )
}

export default function TournamentTitle({ name, date, created, onRename, onRedate, defaultName = DEFAULT_NAME }) {
  const shown = name?.trim() || defaultName
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // Browser tab: "Spring Club Championship · TENNIS.live"
  useEffect(() => {
    document.title = `${shown} · ${BASE_TITLE}`
    return () => {
      document.title = BASE_TITLE
    }
  }, [shown])

  // The tournament's date; older tournaments fall back to the day they were created
  const day = isDay(date) ? date : created ? dayFromTimestamp(created) : null
  const [editingDate, setEditingDate] = useState(false)

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
          placeholder={defaultName}
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
              <PencilIcon />
            </button>
          )}
        </h2>
      )}
      {editingDate ? (
        <input
          type="date"
          className="date-input"
          aria-label="Tournament date"
          autoFocus
          value={day || ''}
          onChange={(e) => isDay(e.target.value) && onRedate(e.target.value)}
          onBlur={() => setEditingDate(false)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditingDate(false)}
        />
      ) : onRedate ? (
        <button
          className="date-button"
          title="Change date"
          aria-label={`Date: ${day ? formatDay(day) : 'none'}. Change date`}
          onClick={() => setEditingDate(true)}
        >
          {day ? formatDay(day) : 'Add date'} <PencilIcon />
        </button>
      ) : (
        day && <p>{formatDay(day)}</p>
      )}
    </div>
  )
}
