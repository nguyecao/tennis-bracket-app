import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { THEMES } from '../lib/theme'

// Custom dropdown (instead of the OS <select>) so it matches the app.
// Keyboard: arrows move, Enter/Space picks, Escape closes.
// hostTheme (viewers only): marks which theme the host is using.
export default function ThemePicker({ theme: current, onChange, hostTheme }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0) // highlighted option
  const ref = useRef(null)
  const menuRef = useRef(null)

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // The menu opens right-aligned to the button. On narrow screens that can push it
  // past the left edge, so nudge it right until it starts no further left than the
  // bracket (the page's content edge). Runs before paint, so there's no jump.
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const menu = menuRef.current
      const app = ref.current.closest('.app')
      menu.style.right = '0px'
      const minLeft = app.getBoundingClientRect().left + parseFloat(getComputedStyle(app).paddingLeft)
      const overflow = minLeft - menu.getBoundingClientRect().left
      if (overflow > 0) menu.style.right = `${-overflow}px`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  function toggle() {
    setActive(THEMES.indexOf(current))
    setOpen((o) => !o)
  }

  function choose(id) {
    onChange(id)
    setOpen(false)
  }

  function onKeyDown(e) {
    const last = THEMES.length - 1
    if (e.key === 'Tab') return setOpen(false)
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        toggle()
      }
      return
    }
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') setActive((i) => (i === last ? 0 : i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => (i === 0 ? last : i - 1))
    else if (e.key === 'Enter' || e.key === ' ') choose(THEMES[active].id)
    else return
    e.preventDefault()
  }

  return (
    <div className="dropdown" ref={ref} onKeyDown={onKeyDown}>
      <button
        className="dropdown-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.name}`}
        aria-activedescendant={open ? `theme-${THEMES[active].id}` : undefined}
        onClick={toggle}
      >
        <span className="dropdown-emoji" aria-hidden="true">{current.emoji}</span>
        <span className="dropdown-label">{current.name}</span>
        <svg className="chevron" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <ul ref={menuRef} className="dropdown-menu" role="listbox" aria-label="Theme">
          {THEMES.map((t, i) => (
            <li
              key={t.id}
              id={`theme-${t.id}`}
              role="option"
              aria-selected={t.id === current.id}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(t.id)}
            >
              {/* data-theme makes the swatch use that theme's own colors */}
              <span className="swatch" data-theme={t.id} />
              <span className="option-emoji">{t.emoji}</span>
              {t.name}
              {t.id === hostTheme && <span className="host-tag">Host</span>}
              {t.id === current.id && <span className="check">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
