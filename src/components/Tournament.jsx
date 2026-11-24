import { useState } from 'react'
import { useFollowed } from '../lib/follow'
import Players from './Players'
import { BYE, getBrackets } from '../lib/bracket'
import Bracket from './Bracket'
import GroupStage from './GroupStage'
import TournamentTitle from './TournamentTitle'
import { isPoolPlay, groupWord } from '../lib/groups'

// Main draw + optional consolation, and for group-stage tournaments a Group Stage tab.
// Leave out onPick / onReorder for a read-only (viewer) view.
// Tabs: [Group Stage] · Main Draw · Players. Leave out onPick / onReorder for a read-only (viewer) view.
// defaultName: shown when the tournament has no name (depends on the theme).
export default function Tournament({ t, onPick, onReorder, onRename, onRedate, defaultName }) {
  const brackets = getBrackets(t)
  const { groups, main, consolation, labels, drawSeeds } = brackets
  // Seeds from the player list (Rank mode). After a group stage, the Main Draw
  // uses the seeds players earned in their groups instead.
  const seedOf = (name) => (t.seeds ? t.seeds.indexOf(name) + 1 || null : null)
  const drawSeedOf = drawSeeds ? (name) => drawSeeds[name] || null : seedOf
  const stageName = isPoolPlay(t.advance) ? 'Pool Play' : groups?.length === 1 && !main ? 'Round Robin' : 'Group Stage'
  const stageShort = { 'Pool Play': 'Pools', 'Group Stage': 'Groups' }[stageName] || stageName // phone tab label
  const groupsDone = groups?.every((g) => g.done)

  // Players highlighted with ★ (this device only)
  const { followed, toggle, clear } = useFollowed(t.created)

  // Start on whichever part is in progress; each person can switch freely after that.
  const [tab, setTab] = useState(groups && (!groupsDone || !main) ? 'groups' : 'main')

  const played = groups ? groups.reduce((n, g) => n + g.played, 0) : 0
  const total = groups ? groups.reduce((n, g) => n + g.matches.length, 0) : 0
  const mainPlayed = main ? main.flat().filter((m) => m.winner && m.a !== BYE && m.b !== BYE).length : 0
  const playerCount = groups ? groups.reduce((n, g) => n + g.players.length, 0) : t.slots.filter((s) => s !== BYE).length

  return (
    <>
      <TournamentTitle
        name={t.name}
        date={t.date}
        created={t.created}
        onRename={onRename}
        onRedate={onRedate}
        defaultName={defaultName}
      />

      <div className="tabs" role="tablist">
        {groups && (
          <button role="tab" aria-selected={tab === 'groups'} onClick={() => setTab('groups')}>
            <span className="wide-only">{stageName}</span>
            <span className="narrow-only">{stageShort}</span>
            <span className="tab-meta">
              {played}/{total}
            </span>
          </button>
        )}
        {main && (
          <button role="tab" aria-selected={tab === 'main'} onClick={() => setTab('main')}>
            <span className="wide-only">Main Draw</span>
            <span className="narrow-only">Draw</span>
            {groups && groupsDone && mainPlayed === 0 && <span className="tab-meta">Ready</span>}
          </button>
        )}
        <button role="tab" aria-selected={tab === 'players'} onClick={() => setTab('players')}>
          Players <span className="tab-meta">{followed.size ? `★ ${followed.size}` : playerCount}</span>
        </button>
      </div>

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
          onShowMain={() => setTab('main')}
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
            waiting={groups ? !groupsDone : false}
          />
          {consolation && (
            <Bracket
              title="Consolation"
              rounds={consolation}
              onPick={onPick}
              seedOf={drawSeedOf}
              followed={followed}
            />
          )}
        </>
      )}
    </>
  )
}
