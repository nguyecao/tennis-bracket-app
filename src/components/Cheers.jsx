import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BURST, cheerName, myAllowance, onCheer, showCheer } from '../lib/cheers'

const MAX_ON_SCREEN = 15 // beyond this, cheers are grouped into one big "×N" emoji
const GROUP_MS = 700 // how long extra cheers are collected before the "×N" goes up
const RISE_MS = 3200
const STAGGER_MS = 90 // cheers that arrive together leave one after another, not in a clump

// Cheers floating up the right side of the screen. Taps go straight through to the page.
export function CheerLayer() {
  const [floats, setFloats] = useState([])
  const live = useRef(0) // how many are on screen right now
  const extra = useRef({}) // emoji -> count waiting to go up as a group
  const timer = useRef(null)

  useEffect(() => {
    let id = 0
    let nextFree = 0 // when the next cheer may set off
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }
    const add = (emoji, count = 1) => {
      live.current++
      const now = Date.now()
      const wait = Math.max(0, nextFree - now)
      nextFree = now + wait + STAGGER_MS
      later(() => launch(emoji, count), wait)
    }
    const launch = (emoji, count) => {
      const f = {
        id: ++id,
        emoji,
        count,
        right: 12 + Math.random() * 56, // px from the right edge
        drift: Math.round((Math.random() - 0.5) * 40), // sideways sway, px
        tilt: Math.round((Math.random() - 0.5) * 24), // degrees
        ms: RISE_MS + Math.random() * 600,
        y: Math.round(Math.random() * 35), // height, vh (used when motion is reduced: no rising)
      }
      setFloats((list) => [...list, f])
      later(() => {
        live.current--
        setFloats((list) => list.filter((x) => x.id !== f.id))
      }, f.ms)
    }
    const flush = () => {
      timer.current = null
      for (const [emoji, count] of Object.entries(extra.current)) add(emoji, count)
      extra.current = {}
    }
    const off = onCheer((emoji) => {
      // In a background tab, skip them: otherwise they'd all go up at once when you come back
      if (document.hidden) return
      if (live.current < MAX_ON_SCREEN) return add(emoji)
      extra.current[emoji] = (extra.current[emoji] || 0) + 1
      timer.current ??= setTimeout(flush, GROUP_MS)
    })
    return () => {
      off()
      clearTimeout(timer.current)
      timers.forEach(clearTimeout)
      live.current = 0
    }
  }, [])

  return createPortal(
    <div className="cheer-layer" aria-hidden="true">
      {floats.map((f) => (
        <span
          key={f.id}
          className={`cheer-float${f.count > 1 ? ' big' : ''}`}
          style={{
            right: f.right,
            '--drift': `${f.drift}px`,
            '--tilt': `${f.tilt}deg`,
            '--y': `${f.y}vh`,
            animationDuration: `${f.ms}ms`,
          }}
        >
          {f.emoji}
          {f.count > 1 && <span className="cheer-count">×{f.count}</span>}
        </span>
      ))}
    </div>,
    document.body
  )
}

// The round Cheer button (bottom right) and its tray of emoji.
// tray: the emoji to offer. onSend(emoji): pass a cheer on to the rest of the room.
export function CheerButton({ tray, onSend }) {
  const [open, setOpen] = useState(false)
  const [pressed, setPressed] = useState(null) // last emoji tapped, for a little bounce
  const allowance = useRef(myAllowance) // shared for the whole visit: no fresh cheers on remount
  const [meter, setMeter] = useState(() => myAllowance.peek())
  const box = useRef(null)
  const toggle = useRef(null)
  const tray1 = useRef(null) // first emoji, focused when the tray opens

  // While refilling, update the dots and the ring on every frame so they fill smoothly.
  // Stops as soon as all cheers are back.
  const full = meter.left >= BURST
  useEffect(() => {
    if (full) return
    let frame
    const tick = () => {
      setMeter(allowance.current.peek())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [full])

  // Close the tray on Escape (back to the button) or a tap anywhere else
  useEffect(() => {
    if (!open) return
    tray1.current?.focus({ preventScroll: true })
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    const onDown = (e) => !box.current?.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  function cheer(emoji) {
    if (!allowance.current.take()) return // none left: the tray's meter already says "Refilling…"
    setMeter(allowance.current.peek())
    setPressed(null)
    requestAnimationFrame(() => setPressed(emoji))
    showCheer(emoji) // straight away on this screen
    onSend(emoji)
  }

  const empty = meter.left < 1
  const refilling = meter.left < BURST

  return createPortal(
    <>
      <div className="cheer-fab" ref={box}>
        {open && (
          <div className="cheer-tray" role="group" aria-label="Send a cheer">
            {/* How many cheers are left: shown once some are used, one dot per cheer */}
            {refilling && (
              <div className="cheer-meter" aria-live="polite">
                <span className="cheer-pips" aria-hidden="true">
                  {Array.from({ length: BURST }, (_, i) =>
                    // Full and empty dots are solid circles; the refilling one fills from the bottom up
                    i < meter.left ? (
                      <span key={i} className="cheer-pip full" />
                    ) : i === meter.left && meter.progress > 0 ? (
                      <span key={i} className="cheer-pip part" style={{ '--fill': meter.progress }} />
                    ) : (
                      <span key={i} className="cheer-pip" />
                    )
                  )}
                </span>
                <span className="cheer-meter-text">
                  {empty ? 'Refilling…' : `${meter.left} ${meter.left === 1 ? 'cheer' : 'cheers'} left`}
                </span>
              </div>
            )}
            <div className="cheer-emojis">
              {tray.map((emoji, i) => (
                <button
                  key={emoji}
                  ref={i === 0 ? tray1 : null}
                  className={`${pressed === emoji ? 'pressed' : ''}${empty ? ' dim' : ''}`}
                  onClick={() => cheer(emoji)}
                  onAnimationEnd={() => setPressed(null)}
                  aria-label={cheerName(emoji)}
                  aria-disabled={empty || undefined}
                  title={cheerName(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          ref={toggle}
          className={`cheer-btn${open ? ' open' : ''}${refilling ? ' refilling' : ''}${empty ? ' empty' : ''}`}
          style={{ '--p': `${(meter.progress * 100).toFixed(2)}%` }}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close cheers' : 'Cheer'}
        >
          <span className="cheer-icon" aria-hidden="true">
            {open ? '✕' : '👏'}
          </span>
        </button>
      </div>
    </>,
    document.body
  )
}

// A short message at the bottom of the screen (e.g. "The host has turned cheers off")
export function CheerNotice({ children }) {
  return createPortal(
    <div className="cheer-toast" role="status">
      {children}
    </div>,
    document.body
  )
}
