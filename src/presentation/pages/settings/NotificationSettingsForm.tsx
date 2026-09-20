import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { Select } from '@/presentation/components/Select'
import { toAppError } from '@/shared/errors/AppError'

import styles from './NotificationSettingsForm.module.css'

// Valores exactos pedidos en el enunciado (rule 8): 1/2/3/5 cuadras,
// 2/5/10 minutos. No son libres a propósito, para que el aviso sea
// predecible para el coordinador que configura esto.
const DISTANCE_BLOCK_OPTIONS = [1, 2, 3, 5]
const TIME_MINUTE_OPTIONS = [2, 5, 10]

const settingsFormSchema = z.object({
  criterion: z.enum([ProximityCriterion.DISTANCE, ProximityCriterion.TIME]),
  distanceBlocks: z.coerce.number().int(),
  timeThresholdMinutes: z.coerce.number().int(),
  blockLengthMeters: z.coerce
    .number({ message: 'Ingresá un número de metros.' })
    .int()
    .min(20, 'Ingresá una longitud de cuadra realista (mínimo 20 m).')
    .max(300, 'Ingresá una longitud de cuadra realista (máximo 300 m).'),
})

// Igual que en IncidentForm: z.coerce.number() separa el tipo de entrada
// (unknown, admite cualquier valor crudo del input) del tipo de salida ya
// validado (number).
type SettingsFormInput = z.input<typeof settingsFormSchema>
type SettingsFormOutput = z.output<typeof settingsFormSchema>

interface NotificationSettingsFormProps {
  readonly settings: NotificationSettings
  readonly onSave: (settings: NotificationSettings) => Promise<void>
}

// La arquitectura queda preparada para decidir entre distancia o tiempo
// estimado (rule 8): ambos valores se guardan siempre, "criterion" define
// cuál está activo, así no se pierde el que queda en segundo plano.
export function NotificationSettingsForm({ settings, onSave }: NotificationSettingsFormProps) {
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormInput, unknown, SettingsFormOutput>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      criterion: settings.criterion,
      distanceBlocks: Math.max(
        1,
        Math.round(settings.distanceThresholdMeters / settings.blockLengthMeters),
      ),
      timeThresholdMinutes: settings.timeThresholdMinutes,
      blockLengthMeters: settings.blockLengthMeters,
    },
  })

  const criterion = watch('criterion')

  async function onSubmit(values: SettingsFormOutput): Promise<void> {
    setSaveError(null)
    setSavedAt(null)
    try {
      await onSave({
        criterion: values.criterion,
        distanceThresholdMeters: values.distanceBlocks * values.blockLengthMeters,
        timeThresholdMinutes: values.timeThresholdMinutes,
        blockLengthMeters: values.blockLengthMeters,
      })
      setSavedAt(Date.now())
    } catch (error) {
      setSaveError(toAppError(error).message)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
    >
      {saveError && <Alert tone="danger">{saveError}</Alert>}
      {savedAt && <Alert tone="success">Configuración guardada correctamente.</Alert>}

      <Select
        label="Criterio de aviso"
        options={[
          { value: ProximityCriterion.DISTANCE, label: 'Por distancia recorrida' },
          { value: ProximityCriterion.TIME, label: 'Por tiempo estimado de llegada' },
        ]}
        {...register('criterion')}
      />

      {criterion === ProximityCriterion.TIME ? (
        <Select
          label="Avisar cuando falten"
          options={TIME_MINUTE_OPTIONS.map((minutes) => ({
            value: minutes.toString(),
            label: `${minutes.toString()} minutos`,
          }))}
          error={errors.timeThresholdMinutes?.message}
          {...register('timeThresholdMinutes')}
        />
      ) : (
        <Select
          label="Avisar cuando falten"
          options={DISTANCE_BLOCK_OPTIONS.map((blocks) => ({
            value: blocks.toString(),
            label: `${blocks.toString()} ${blocks === 1 ? 'cuadra' : 'cuadras'}`,
          }))}
          error={errors.distanceBlocks?.message}
          {...register('distanceBlocks')}
        />
      )}

      <Input
        label="Longitud de referencia de una cuadra (metros)"
        type="number"
        hint="No todas las cuadras miden lo mismo: ajustá este valor según la zona."
        error={errors.blockLengthMeters?.message}
        {...register('blockLengthMeters')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar configuración
      </Button>
    </form>
  )
}
