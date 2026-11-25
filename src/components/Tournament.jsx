import { useLayoutEffect, useRef, useState } from 'react'
import { useFollowed } from '../lib/follow'
import Players from './Players'
import { BYE, getBrackets } from '../lib/bracket'
import Bracket from './Bracket'
import GroupStage from './GroupStage'
import TournamentTitle from './TournamentTitle'
import QrCard from './QrShare'
import ScoreEditor from './ScoreEditor'
import Celebration, { useCelebrations } from './Celebration'
import { isPoolPlay, groupWord } from '../lib/groups'

// Tabs: [Group Stage] · Main Draw · Players. Leave out onPick / onReorder for a read-only (viewer) view.
// defaultName: shown when the tournament has no name (depends on the theme).
// shareRoom: live room code, if any; shows a QR code people can scan to watch.
// onScore (host): save a match score; only used when the tournament keeps score.
export default function Tournament({ t, onPick, onReorder, onRename, onRedate, onScore, defaultName, shareRoom }) {
  const brackets = getBrackets(t)
  const { groups, main, consolation, labels, drawSeeds } = brackets
  // Seeds from the player list (Rank mode). After a group stage, the Main Draw
  // uses the seeds players earned in their groups instead.
  const seedOf = (name) => (t.seeds ? t.seeds.indexOf(name) + 1 || null : null)
  const drawSeedOf = drawSeeds ? (name) => drawSeeds[name] || null : seedOf
  const stageName = isPoolPlay(t.advance) ? 'Pool Play' : groups?.length === 1 && !main ? 'Round Robin' : 'Group Stage'
  const stageShort = { 'Pool Play': 'Pools', 'Group Stage': 'Groups' }[stageName] || stageName // phone tab label
  const groupsDone = groups?.every((g) => g.done)

  // Confetti when a final (Main Draw or Consolation) is decided, on every screen at once
  const celebration = useCelebrations(t, brackets)

  // Download a PDF of the draw as it stands right now (the PDF code loads on first use)
  const [pdf, setPdf] = useState(null) // null | 'saving' | 'failed'
  async function savePdf() {
    setPdf('saving')
    try {
      const { downloadPdf } = await import('../lib/pdf')
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--court')
      await downloadPdf(t, { name: t.name?.trim() || defaultName, accent })
      setPdf(null)
    } catch (e) {
      console.error(e)
      setPdf('failed')
    }
  }

  // Score entry (host, when this tournament keeps score)
  const [scoring, setScoring] = useState(null) // the match being scored
  const openScore = t.scoring && onScore && onPick ? setScoring : undefined

  // Players highlighted with ★ (this device only)
  const { followed, toggle, clear } = useFollowed(t.created)

  // Start on whichever part is in progress; each person can switch freely after that.
  const [tab, setTab] = useState(groups && (!groupsDone || !main) ? 'groups' : 'main')

  // Tab order, so the content can slide in from the side you're moving towards
  const order = ['groups', 'main', 'players']
  const lastTab = useRef(tab)
  const direction = order.indexOf(tab) >= order.indexOf(lastTab.current) ? 'right' : 'left'
  const switchTab = (next) => {
    lastTab.current = tab
    setTab(next)
  }

  // Numbers shown on the tabs
  const played = groups ? groups.reduce((n, g) => n + g.played, 0) : 0
  const total = groups ? groups.reduce((n, g) => n + g.matches.length, 0) : 0
  const mainPlayed = main ? main.flat().filter((m) => m.winner && m.a !== BYE && m.b !== BYE).length : 0
  const playerCount = groups ? groups.reduce((n, g) => n + g.players.length, 0) : t.slots.filter((s) => s !== BYE).length

  // Sliding highlight behind the selected tab: measure the selected tab and move to it
  const tabsRef = useRef(null)
  const [pill, setPill] = useState(null)
  const placedTab = useRef(null)
  const moved = useRef(false) // no slide on first draw, only when switching
  useLayoutEffect(() => {
    const box = tabsRef.current
    if (!box) return
    // Slide only when switching tabs. When the selected tab just changes size (e.g. "Players 12"
    // becomes "Players ★ 1"), the tab bar itself resizes instantly, so the pill does too, in the
    // same frame, so the two are never out of step.
    let switching = placedTab.current !== tab
    placedTab.current = tab
    const place = () => {
      const on = box.querySelector('[aria-selected="true"]')
      if (!on) return
      const next = { left: on.offsetLeft, width: on.offsetWidth, height: on.offsetHeight, top: on.offsetTop }
      const slide = switching && moved.current // decide now; the update below runs later
      setPill((prev) => {
        const same = prev && ['left', 'width', 'height', 'top'].every((k) => prev[k] === next[k])
        return same ? prev : { ...next, slide }
      })
      switching = false
    }
    place()
    const watch = new ResizeObserver(place) // labels and counts change width; screens rotate
    watch.observe(box)
    box.querySelectorAll('button').forEach((b) => watch.observe(b))
    return () => watch.disconnect()
    // Re-measure right away (same frame) whenever a tab label can change width
  }, [tab, !!groups, !!main, followed.size, played, total, playerCount, groupsDone, mainPlayed === 0])
  useLayoutEffect(() => {
    if (pill) requestAnimationFrame(() => (moved.current = true))
  }, [pill])

  return (
    <>
      {/* Left: name, date and tabs. Right: QR code (when live). Stacks on phones. */}
      <div className="title-row">
        <div className="title-main">
          <TournamentTitle
            name={t.name}
            date={t.date}
            created={t.created}
            onRename={onRename}
            onRedate={onRedate}
            defaultName={defaultName}
          />
          {/* Tabs on the left, Download PDF on the right */}
          <div className="tab-row">
            <div className="tabs" role="tablist" ref={tabsRef}>
              {pill && (
                <span
                  className={`tab-pill${pill.slide ? ' sliding' : ''}`}
                  style={{ transform: `translateX(${pill.left}px)`, width: pill.width, height: pill.height, top: pill.top }}
                  aria-hidden="true"
                />
              )}
              {groups && (
                <button role="tab" aria-selected={tab === 'groups'} onClick={() => switchTab('groups')}>
                  <span className="wide-only">{stageName}</span>
                  <span className="narrow-only">{stageShort}</span>
                  <span className="tab-meta">
                    {played}/{total}
                  </span>
                </button>
              )}
              {main && (
                <button role="tab" aria-selected={tab === 'main'} onClick={() => switchTab('main')}>
                  <span className="wide-only">Main Draw</span>
                  <span className="narrow-only">Draw</span>
                  {groups && groupsDone && mainPlayed === 0 && <span className="tab-meta tab-ready">Ready</span>}
                </button>
              )}
              <button role="tab" aria-selected={tab === 'players'} onClick={() => switchTab('players')}>
                Players <span className="tab-meta">{followed.size ? `★ ${followed.size}` : playerCount}</span>
              </button>
            </div>
            <button
              className="pdf-button"
              onClick={savePdf}
              disabled={pdf === 'saving'}
              title="Download a printable PDF of the draw"
              aria-label={pdf === 'saving' ? 'Preparing PDF' : 'Download PDF'}
            >
              <DownloadIcon />
              <span className="pdf-label">
                {pdf === 'saving' ? 'Preparing…' : pdf === 'failed' ? 'Try again' : 'Download PDF'}
              </span>
            </button>
          </div>
        </div>
        {shareRoom && <QrCard room={shareRoom} />}
      </div>

      {/* Content fades and slides in from the side of the tab you picked */}
      <div key={tab} className={`tab-panel from-${direction}`}>
        {tab === 'players' ? (
          <Players
            t={t}
            brackets={brackets}
            groupWord={groupWord(t.advance)}
            seedOf={seedOf}
            followed={followed}
            onToggle={toggle}
            onClear={clear}
          />
        ) : groups && (tab === 'groups' || !main) ? (
          <GroupStage
            groups={groups}
            advance={t.advance}
            hasMainDraw={!!main}
            onPick={onPick}
            onReorder={onReorder}
            seedOf={seedOf}
            followed={followed}
            onScore={openScore}
            scoreTiebreak={!!(t.scoring && t.scoreTiebreak)}
            onShowMain={() => switchTab('main')}
          />
        ) : (
          <>
            <Bracket
              title="Main Draw"
              rounds={main}
              labels={labels}
              onPick={onPick}
              seedOf={drawSeedOf}
              followed={followed}
              onScore={openScore}
              waiting={groups ? !groupsDone : false}
            />
            {consolation && (
              <Bracket
                title="Consolation"
                rounds={consolation}
                onPick={onPick}
                seedOf={drawSeedOf}
                followed={followed}
                onScore={openScore}
                waiting={groups ? !groupsDone : false}
              />
            )}
          </>
        )}
      </div>

      {celebration.current && (
        <Celebration
          key={celebration.current.id}
          champion={celebration.current}
          title={t.name?.trim() || defaultName}
          onDone={celebration.done}
        />
      )}

      {scoring && (
        <ScoreEditor
          match={scoring}
          onClose={() => setScoring(null)}
          onSave={(sets) => {
            onScore(scoring.id, sets)
            setScoring(null)
          }}
        />
      )}
    </>
  )
}

function DownloadIcon() {
  return (
    <svg className="download-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}
