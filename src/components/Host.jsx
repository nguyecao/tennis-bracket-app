import { useState } from 'react'
import { makeSlots, shuffle, withPick } from '../lib/bracket'
import { useSavedState } from '../lib/storage'
import { useTheme } from '../lib/theme'
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
    update({
      tournament: {
        slots: makeSlots(players),
        seeds: state.mode === 'rank' ? players : null,
        consolation: state.consolation && players.length >= 4,
        winners: {},
      },
    })
  }

  // Click a player to make them the winner; click again to undo.
  const pick = (id, name) => update({ tournament: withPick(tournament, id, name) })

  // Ask before throwing away entered results.
  const hasResults = tournament && Object.keys(tournament.winners).length > 0
  const [confirm, setConfirm] = useState(null) // { title, message, label, action }
  const guard = (title, message, label, action) =>
    hasResults ? setConfirm({ title, message, label, action }) : action()

  const clearResults = () => update({ tournament: { ...tournament, winners: {} } })
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
        <Tournament t={tournament} onPick={pick} />
      ) : (
        <Setup
          state={state}
          update={update}
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
