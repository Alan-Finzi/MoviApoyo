import type { Guardian } from '@/domain/entities/Guardian'
import type { GuardianRepository } from '@/domain/repositories/GuardianRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { guardiansStore } from './stores'

export class MockGuardianRepository implements GuardianRepository {
  getGuardians(): Promise<Guardian[]> {
    return Promise.resolve(guardiansStore.getState())
  }

  getGuardianById(id: string): Promise<Guardian> {
    const guardian = guardiansStore.getState().find((item) => item.id === id)
    if (!guardian) throw new NotFoundError(`No existe el tutor con id "${id}".`)
    return Promise.resolve(guardian)
  }

  registerGuardian(guardian: Omit<Guardian, 'id'>): Promise<Guardian> {
    const newGuardian: Guardian = { ...guardian, id: `guardian-${crypto.randomUUID()}` }
    guardiansStore.setState((guardians) => [...guardians, newGuardian])
    return Promise.resolve(newGuardian)
  }
}
