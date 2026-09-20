import { useState } from 'react'

import { useCases } from '@/app/providers/dependencies'
import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import { Button } from '@/presentation/components/Button'

import styles from './PassengersPage.module.css'

interface SensitiveInfoCellProps {
  readonly passengerId: string
}

// Componente separado a propósito (rule 12): pedir información sensible es
// una acción explícita por fila, nunca algo que viaje junto al listado.
export function SensitiveInfoCell({ passengerId }: SensitiveInfoCellProps) {
  const [info, setInfo] = useState<PassengerSensitiveInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleToggle(): Promise<void> {
    if (info) {
      setInfo(null)
      return
    }
    setIsLoading(true)
    try {
      const result = await useCases.getPassengerSensitiveInfo.execute(passengerId)
      setInfo(result)
    } catch {
      setInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.sensitiveCell}>
      <Button variant="ghost" onClick={() => void handleToggle()} isLoading={isLoading}>
        {info ? 'Ocultar' : 'Ver información sensible'}
      </Button>
      {info && (
        <div className={styles.sensitiveDetails}>
          {info.documentNumber && <span>Documento: {info.documentNumber}</span>}
          {info.medicalNotes && <span>{info.medicalNotes}</span>}
          {info.observations && <span>{info.observations}</span>}
        </div>
      )}
    </div>
  )
}
