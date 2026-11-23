import { useEffect, useRef } from 'react'

// Small styled modal built on <dialog>, which gives us focus trapping and Escape-to-close.
// With onConfirm: Cancel + confirm buttons. Without: a single Close button.
export default function Modal({ title, children, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    ref.current.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault() // Escape: let React decide, so state stays in sync
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()} // click on the backdrop
    >
      <div className="modal-body">
        {title && <h2>{title}</h2>}
        {children}
        <div className="modal-actions">
          {onConfirm ? (
            <>
              <button onClick={onClose}>Cancel</button>
              <button className={danger ? 'danger' : 'primary'} autoFocus onClick={onConfirm}>
                {confirmLabel}
              </button>
            </>
          ) : (
            <button className="primary" autoFocus onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
