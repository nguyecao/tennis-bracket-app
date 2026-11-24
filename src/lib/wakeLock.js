import { useEffect } from 'react'

// Keep the screen from dimming or locking while `active` is true (e.g. while hosting live).
// Uses the Screen Wake Lock API (Chrome, Edge, Safari 16.4+, Firefox 126+). Browsers without it
// simply ignore this. The lock is dropped by the browser whenever the tab is hidden, so it is
// requested again each time the page becomes visible.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let stopped = false

    async function request() {
      if (stopped || document.visibilityState !== 'visible' || (lock && !lock.released)) return
      try {
        lock = await navigator.wakeLock.request('screen')
        if (stopped) lock.release()
      } catch {
        // e.g. battery saver or the browser said no; nothing else to do
      }
    }

    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
    }
  }, [active])
}
