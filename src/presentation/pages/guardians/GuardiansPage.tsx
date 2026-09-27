import { useState } from 'react'

import type { Guardian } from '@/domain/entities/Guardian'
import { Button } from '@/presentation/components/Button'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Modal } from '@/presentation/components/Modal'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useGuardians } from '@/presentation/hooks/useGuardians'
import { formatPhone } from '@/shared/utils/formatPhone'

import { GuardianForm } from './GuardianForm'
import styles from './GuardiansPage.module.css'

const columns: readonly TableColumn<Guardian>[] = [
  { key: 'fullName', header: 'Nombre completo', render: (guardian) => guardian.fullName },
  { key: 'relationship', header: 'Vínculo', render: (guardian) => guardian.relationship },
  { key: 'phone', header: 'Teléfono', render: (guardian) => formatPhone(guardian.phone) },
]

export function GuardiansPage() {
  const guardians = useGuardians()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Tutores</h1>
        <Button onClick={() => setIsModalOpen(true)}>Nuevo tutor</Button>
      </div>

      {guardians.state.status === 'loading' && <LoadingState message="Cargando tutores…" />}
      {guardians.state.status === 'error' && (
        <ErrorState message={guardians.state.message} onRetry={guardians.reload} />
      )}
      {guardians.state.status === 'empty' && <EmptyState title="Todavía no hay tutores cargados" />}
      {guardians.state.status === 'success' && (
        <Table columns={columns} rows={guardians.state.data} getRowKey={(guardian) => guardian.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo tutor">
        <GuardianForm
          onRegistered={() => {
            setIsModalOpen(false)
            guardians.reload()
          }}
        />
      </Modal>
    </div>
  )
}
