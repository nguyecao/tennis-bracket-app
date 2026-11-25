import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { champions } from '../lib/champions'

const SHOW_MS = 10000 // how long the celebration stays up (tap or Escape closes it sooner)
const STALE_MS = 2 * 60 * 1000 // back after longer than this (phone in a pocket): skip it, it's old news

// Celebrate a champion the moment their final is decided. Runs on the host and on every
// viewer, so everyone sees it together. Not on arrival (a final that was already decided),
// and not when results are cleared.
export function useCelebrations(t, brackets) {
  const now = champions(t, brackets)
  const seen = useRef(null)
  seen.current ??= Object.fromEntries(now.map((c) => [c.key, c.name]))
  const [queue, setQueue] = useState([])

  const nextId = useRef(0)

  const signature = now.map((c) => `${c.key}:${c.name}`).join('|')
  useEffect(() => {
    const names = Object.fromEntries(now.map((c) => [c.key, c.name]))
    const fresh = now
      .filter((c) => seen.current[c.key] !== c.name)
      .map((c) => ({ ...c, id: ++nextId.current, at: Date.now() }))
    seen.current = names
    // Drop any celebration whose final was just undone (or changed), then add the new ones
    setQueue((q) => [...q.filter((c) => names[c.key] === c.name), ...fresh])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const current = queue[0] || null
  const done = useCallback(() => setQueue((q) => q.slice(1)), [])
  return { current, done }
}

// Full-screen confetti and a big champion card. Closes by itself, or on a tap / Escape.
// title: the tournament's name, shown small above the champion.
export default function Celebration({ champion, title, onDone }) {
  const [leaving, setLeaving] = useState(false)

  // Start the clock only while the page is visible, so a viewer who switched apps
  // still gets the moment when they come back.
  useEffect(() => {
    let timer
    const start = () => {
      if (document.hidden || timer) return
      if (Date.now() - champion.at > STALE_MS) return onDone() // decided long ago: don't celebrate now
      timer = setTimeout(() => setLeaving(true), SHOW_MS)
    }
    start()
    document.addEventListener('visibilitychange', start)
    const onKey = (e) => e.key === 'Escape' && setLeaving(true)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', start)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After the fade-out, move on to the next champion (if any)
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onDone, 350)
    return () => clearTimeout(t)
  }, [leaving, onDone])

  return createPortal(
    <div className={`celebration${leaving ? ' leaving' : ''}`} onClick={() => setLeaving(true)}>
      <Confetti />
      <div className="celebration-card" role="status" aria-live="assertive">
        <div className="celebration-trophy" aria-hidden="true">
          🏆
        </div>
        {title && <p className="celebration-title">{title}</p>}
        <p className="celebration-label">{champion.label}</p>
        <p className="celebration-name">{champion.name}</p>
        {champion.opponent && (
          <p className="celebration-final">
            def. {champion.opponent}
            {champion.score && <span className="celebration-score">{champion.score}</span>}
          </p>
        )}
        <p className="celebration-hint">
          <span className="touch-only">Tap anywhere to close</span>
          <span className="mouse-only">Click anywhere or press Esc to close</span>
        </p>
      </div>
    </div>,
    document.body
  )
}

// Confetti in the theme's colors, drawn on a canvas (no library needed)
function Confetti() {
  const canvas = useRef(null)

  useEffect(() => {
    const c = canvas.current
    const ctx = c.getContext('2d')
    const css = getComputedStyle(document.documentElement)
    const colors = ['--ball', '--court', '--accent', '--follow']
      .map((v) => css.getPropertyValue(v).trim())
      .filter(Boolean)
      .concat('#ffffff')
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches

    let w, h
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = c.clientWidth
      h = c.clientHeight
      c.width = w * dpr
      c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)

    const count = Math.min(220, Math.round((w * h) / 4500))
    const pieces = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: still ? Math.random() * h : -20 - Math.random() * h * 0.9, // start above the screen, staggered
      vx: (Math.random() - 0.5) * 1.2,
      vy: 2 + Math.random() * 2.5,
      size: 6 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      vspin: (Math.random() - 0.5) * 0.25,
      sway: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.3,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of pieces) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.spin)
        ctx.fillStyle = p.color
        if (p.round) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // a strip of paper, flipping (its width shrinks and grows as it turns)
          ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(Math.cos(p.spin * 2)), p.size, (p.size / 2) * Math.abs(Math.cos(p.spin * 2)) + 1)
        }
        ctx.restore()
      }
    }

    if (still) {
      draw() // reduced motion: confetti scattered, not falling
      return () => window.removeEventListener('resize', size)
    }

    let frame
    let last = performance.now()
    const tick = (now) => {
      const step = Math.min(3, (now - last) / 16.7) // keep the same speed on 60 Hz and 120 Hz screens
      last = now
      let alive = 0
      for (const p of pieces) {
        p.sway += 0.05 * step
        p.x += (p.vx + Math.sin(p.sway) * 0.8) * step
        p.y += p.vy * step
        p.spin += p.vspin * step
        if (p.y < h + 20) alive++
      }
      draw()
      if (alive) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', size)
    }
  }, [])

  return <canvas className="confetti" ref={canvas} aria-hidden="true" />
}
