import type { Driver } from '@/domain/entities/Driver'
import { DriverStatus } from '@/domain/enums/DriverStatus'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import { createPhoneNumber } from '@/domain/valueObjects/PhoneNumber'

export interface RegisterDriverInput {
  readonly firstName: string
  readonly lastName: string
  readonly phone: string
  readonly assignedVehicleId?: string | null
}

// Alta de chofer desde el panel de admin. Arranca siempre en DISPONIBLE — el
// resto de los estados (EN_TRASLADO, DESCANSO, etc.) son transiciones que
// ocurren después, a partir del flujo de traslados.
export class RegisterDriverUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  execute(input: RegisterDriverInput): Promise<Driver> {
    return this.driverRepository.registerDriver({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: createPhoneNumber(input.phone),
      assignedVehicleId: input.assignedVehicleId ?? null,
      status: DriverStatus.AVAILABLE,
    })
  }
}
