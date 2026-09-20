import { useEffect, useId, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { X } from 'lucide-react'

import { IconButton } from './IconButton'
import styles from './Modal.module.css'

interface ModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
}

// Se apoya en <dialog> nativo: foco atrapado dentro del modal, cierre con
// Escape y overlay ya vienen resueltos por el navegador (rule 17), sin
// reimplementar un focus-trap a mano.
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  // <dialog> ya es accesible por teclado de forma nativa (Escape cierra, el
  // foco queda atrapado dentro). El onClick de acá es solo el cierre "al
  // hacer click afuera", una conveniencia adicional para mouse que no
  // reemplaza ningún comportamiento de teclado.
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
    >
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <IconButton label="Cerrar" onClick={onClose} type="button">
          <X size={18} aria-hidden="true" />
        </IconButton>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
