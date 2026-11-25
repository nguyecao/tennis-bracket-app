import { useState } from 'react'
import { makeSlots, shuffle, withPick, withTieOrder, withScore } from '../lib/bracket'
import { makeGroups } from '../lib/groups'
import { useSavedState } from '../lib/storage'
import { useTheme } from '../lib/theme'
import { today } from '../lib/dates'
import Header from './Header'
import Modal from './Modal'
import LiveControls from './LiveControls'
import Setup from './Setup'
import Tournament from './Tournament'

// The person running the tournament: enters names, picks winners, can go live.
// startAtHome: show the home (setup) page even if a bracket is saved, e.g. after leaving a room.
export default function Host({ startAtHome = false }) {
  const [state, update] = useSavedState()
  const [theme, setTheme] = useTheme()
  const { tournament } = state
  const [home, setHome] = useState(startAtHome)
  const showBracket = tournament && !home

  function generate(names) {
    setHome(false)
    const players = state.mode === 'shuffle' ? shuffle(names) : names
    const common = {
      name: state.name.trim(),
      date: state.date || today(), // not changed in setup = today
      scoring: state.scoring, // keep score for this tournament
      scoreTiebreak: state.scoring && state.format === 'groups' && state.scoreTiebreak,
      scores: {},
      created: Date.now(),
      seeds: state.mode === 'rank' ? players : null,
      winners: {},
    }
    update({
      date: '', // the next tournament defaults to its own day again
      tournament:
        state.format === 'groups'
          ? {
              ...common,
              format: 'groups',
              groups: makeGroups(players, state.groupSize),
              advance: state.advance,
              consolation: state.consolation,
              tieOrder: {},
            }
          : { ...common, slots: makeSlots(players), consolation: state.consolation && players.length >= 4 },
    })
  }

  // Click a player to make them the winner; click again to undo.
  const pick = (id, name) => update({ tournament: withPick(tournament, id, name) })

  const rename = (name) => update({ tournament: { ...tournament, name } })
  const redate = (date) => update({ tournament: { ...tournament, date } })
  const saveScore = (id, sets) => update({ tournament: withScore(tournament, id, sets) })

  // Host's order for group players still tied after head-to-head
  const reorder = (group, order) => update({ tournament: withTieOrder(tournament, group, order) })

  // Ask before throwing away entered results.
  const hasResults = tournament && Object.keys(tournament.winners).length > 0
  const [confirm, setConfirm] = useState(null) // { title, message, label, action }
  const guard = (title, message, label, action) =>
    hasResults ? setConfirm({ title, message, label, action }) : action()

  const clearResults = () => update({ tournament: { ...tournament, winners: {}, tieOrder: {}, scores: {} } })
  const newTournament = () => update({ tournament: null })

  return (
    <div className="app">
      <Header theme={theme} onThemeChange={setTheme}>
        {!home && (
          <LiveControls
            room={state.room}
            tournament={tournament}
            theme={theme.id}
            onRoomChange={(room) => update({ room })}
          />
        )}
        {showBracket && (
          <>
            <button
              onClick={() =>
                guard('Clear results?', 'Every winner you picked will be removed.', 'Clear results', clearResults)
              }
            >
              Clear<span className="wide-only"> results</span>
            </button>
            <button
              className="primary"
              // Always confirm, even before any results are entered
              onClick={() =>
                setConfirm({
                  title: 'Start a new tournament?',
                  message: hasResults
                    ? 'The current bracket and its results will be lost. Your player list is kept.'
                    : 'The current bracket will be closed. Your player list is kept.',
                  label: 'Start new',
                  action: newTournament,
                })
              }
            >
              New<span className="wide-only"> tournament</span>
            </button>
          </>
        )}
      </Header>

      {showBracket ? (
        <Tournament
          key={tournament.created}
          t={tournament}
          onPick={pick}
          onReorder={reorder}
          onRename={rename}
          onRedate={redate}
          onScore={saveScore}
          defaultName={theme.defaultName}
          shareRoom={state.room}
        />
      ) : (
        <Setup
          state={state}
          update={update}
          defaultName={theme.defaultName}
          onGenerate={(names) =>
            guard(
              'Replace your bracket?',
              'You have a bracket with results saved. Generating a new one will replace it.',
              'Replace',
              () => generate(names)
            )
          }
          onResume={tournament ? () => setHome(false) : null}
        />
      )}

      {confirm && (
        <Modal
          title={confirm.title}
          confirmLabel={confirm.label}
          danger
          onConfirm={() => {
            confirm.action()
            setConfirm(null)
          }}
          onClose={() => setConfirm(null)}
        >
          <p>{confirm.message}</p>
        </Modal>
      )}
    </div>
  )
}
