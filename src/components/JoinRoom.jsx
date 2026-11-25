import { useLayoutEffect, useRef, useState } from 'react'
import { cleanCode } from '../lib/live'

// "Watching someone else's bracket?" — typing a code switches to viewer mode.
export default function JoinRoom() {
  const [code, setCode] = useState('')

  function join(e) {
    e.preventDefault()
    if (code.length === 6) location.hash = `room=${code}`
  }

  // When the code box and Join button drop below the message, center everything
  const form = useRef(null)
  const [wrapped, setWrapped] = useState(false)
  useLayoutEffect(() => {
    const el = form.current
    const check = () => {
      const msg = el.firstElementChild.getBoundingClientRect()
      const controls = el.lastElementChild.getBoundingClientRect()
      setWrapped(controls.top >= msg.bottom - 1)
    }
    check()
    const watch = new ResizeObserver(check)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  return (
    <form className={`join${wrapped ? ' wrapped' : ''}`} onSubmit={join} ref={form}>
      <span className="muted">Watching someone else's bracket?</span>
      {/* Code box and Join button stay together; if they don't fit beside the
          message, they wrap to the next line as a pair */}
      <span className="join-controls">
        <input
          value={code}
          placeholder="ROOM CODE"
          aria-label="Room code"
          onChange={(e) => setCode(cleanCode(e.target.value))}
        />
        <button disabled={code.length !== 6}>Join</button>
      </span>
    </form>
  )
}
