import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TripStatus } from '@/domain/enums/TripStatus'

import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('muestra la etiqueta legible correspondiente al estado del traslado', () => {
    render(<StatusBadge status={TripStatus.IN_TRANSIT} />)
    expect(screen.getByText('En traslado')).toBeInTheDocument()
  })

  it('muestra el estado de incidente', () => {
    render(<StatusBadge status={TripStatus.INCIDENT} />)
    expect(screen.getByText('Incidente')).toBeInTheDocument()
  })
})
