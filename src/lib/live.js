import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { isTournament } from './bracket'
import { isCheer, viewerAllowance, showCheer } from './cheers'

// Rooms use the free PeerJS cloud server only to introduce browsers to each other.
// Bracket data goes directly from the host's browser to viewers. Nothing is stored.
const PREFIX = 'tennis-bracket-'
const host = import.meta.env.VITE_PEER_HOST // optional: your own PeerJS server, e.g. "localhost:9000"
const OPTIONS = host
  ? { host: host.split(':')[0], port: +host.split(':')[1] || 443, secure: !host.includes('localhost') }
  : {}

export function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O or 1/I mix-ups
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const cleanCode = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

export const roomLink = (code) => `${location.origin}${location.pathname}#room=${code}`

// If the peer loses the server but isn't destroyed, reconnect (after a pause, so we
// never try to revive a peer that is in the middle of being destroyed).
function keepAlive(peer, isStopped, onRetry) {
  peer.on('disconnected', () => {
    setTimeout(() => {
      if (isStopped() || peer.destroyed || !peer.disconnected) return
      onRetry()
      peer.reconnect()
    }, 2000)
  })
}

// Message sent to viewers: { tournament, theme, cheers, scoring }. tournament is null while the
// host is setting up a new bracket; cheers says whether the host allows cheering; scoring is the
// match whose score box the host has open (or null).
// Cheers travel separately as { cheer: '👏' }.
const isMessage = (m) =>
  !!m && (m.tournament === null || isTournament(m.tournament)) && typeof m.theme === 'string'

// Host: broadcast the tournament (and theme) to everyone in the room. The only thing viewers
// can send back is a cheer, so only the host can change results.
export function useHost(code, tournament, theme, cheers = true, scoring = null) {
  const [status, setStatus] = useState('off')
  const [viewers, setViewers] = useState(0)
  const conns = useRef([])
  const latest = useRef(null)
  latest.current = { tournament, theme, cheers, scoring }

  useEffect(() => {
    if (!code) return
    let peer, timer
    let stopped = false
    const sync = () => setViewers(conns.current.length)

    function start() {
      setStatus('connecting')
      const p = (peer = new Peer(PREFIX + code, OPTIONS))
      p.on('open', () => setStatus('live'))
      keepAlive(p, () => stopped, () => setStatus('connecting'))
      p.on('error', () => {
        // Fatal errors destroy the peer (e.g. the code is still held from a refresh):
        // start over in a few seconds. Other errors only affect one viewer.
        setTimeout(() => {
          if (stopped || !p.destroyed) return
          setStatus('connecting')
          clearTimeout(timer)
          timer = setTimeout(start, 3000)
        })
      })
      p.on('connection', (conn) => {
        // A viewer's cheer: check it, show it here, and pass it on to everyone else.
        // Each viewer has their own allowance, so nobody can flood the room.
        const allowance = viewerAllowance()
        conn.on('data', (m) => {
          if (!latest.current.cheers || !isCheer(m) || !allowance.take()) return
          showCheer(m.cheer)
          conns.current.forEach((c) => c !== conn && c.open && c.send({ cheer: m.cheer }))
        })
        conn.on('open', () => {
          conns.current.push(conn)
          sync()
          conn.send(latest.current)
        })
        const drop = () => {
          conns.current = conns.current.filter((c) => c !== conn)
          sync()
        }
        conn.on('close', drop)
        conn.on('error', drop) // viewer vanished without a clean goodbye
      })
    }

    // Only one tab in this browser can host a room. Other tabs wait quietly and
    // take over automatically if the hosting tab closes.
    let release
    const ctrl = new AbortController()
    if (navigator.locks) {
      // Only say "live in another tab" if we don't get the lock straight away
      let acquired = false
      setStatus('connecting')
      const waiting = setTimeout(() => !acquired && !stopped && setStatus('elsewhere'), 400)
      navigator.locks
        .request(PREFIX + code, { signal: ctrl.signal }, () => {
          acquired = true
          clearTimeout(waiting)
          if (stopped) return
          start()
          return new Promise((r) => (release = r))
        })
        .catch(() => {}) // aborted on cleanup
    } else {
      start()
    }

    return () => {
      stopped = true
      clearTimeout(timer)
      ctrl.abort()
      release?.()
      peer?.destroy()
      conns.current = []
      setViewers(0)
      setStatus('off')
    }
  }, [code])

  useEffect(() => {
    conns.current.forEach((c) => c.open && c.send({ tournament, theme, cheers, scoring }))
  }, [tournament, theme, cheers, scoring])

  // The host's own cheer (already shown on the host's screen) goes to every viewer
  const sendCheer = (emoji) => conns.current.forEach((c) => c.open && c.send({ cheer: emoji }))

  return { status, viewers, sendCheer }
}

// Viewer: connect to a room and keep retrying if the host isn't there.
export function useViewer(code) {
  const [status, setStatus] = useState('connecting')
  const [message, setMessage] = useState(null) // latest { tournament, theme, cheers } from the host
  const connRef = useRef(null)

  useEffect(() => {
    let peer, conn, connectTimer, peerTimer
    let stopped = false

    const retryConnect = () => {
      if (stopped) return
      setStatus('offline')
      clearTimeout(connectTimer)
      connectTimer = setTimeout(connect, 4000)
    }

    function connect() {
      if (stopped || conn?.open || !peer.open) return // !open: runs again on 'open'
      const c = peer.connect(PREFIX + code, { reliable: true })
      const old = conn
      conn = connRef.current = c
      old?.close()
      c.on('open', () => c === conn && setStatus('live'))
      c.on('data', (m) => {
        if (c !== conn) return
        if (isMessage(m)) setMessage(m)
        else if (isCheer(m)) showCheer(m.cheer)
      })
      c.on('close', () => c === conn && retryConnect())
      c.on('error', () => c === conn && retryConnect())
    }

    function start() {
      const p = (peer = new Peer(OPTIONS))
      p.on('open', connect)
      keepAlive(p, () => stopped, () => {})
      p.on('error', (err) => {
        if (err.type === 'peer-unavailable') return retryConnect() // host not online
        setTimeout(() => {
          if (stopped || !p.destroyed) return
          setStatus('offline')
          clearTimeout(peerTimer)
          peerTimer = setTimeout(start, 4000)
        })
      })
    }

    start()
    return () => {
      stopped = true
      clearTimeout(connectTimer)
      clearTimeout(peerTimer)
      peer.destroy()
    }
  }, [code])

  // This viewer's cheer (already shown on their own screen) goes to the host to pass on
  const sendCheer = (emoji) => connRef.current?.open && connRef.current.send({ cheer: emoji })

  // tournament: undefined = nothing received yet, null = host is setting up
  return {
    status,
    tournament: message?.tournament,
    theme: message?.theme,
    cheersOn: message?.cheers === true,
    hostScoring: typeof message?.scoring === 'string' ? message.scoring : null,
    sendCheer,
  }
}
