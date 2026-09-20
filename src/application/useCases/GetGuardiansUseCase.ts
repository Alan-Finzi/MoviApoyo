import type { Guardian } from '@/domain/entities/Guardian'
import type { GuardianRepository } from '@/domain/repositories/GuardianRepository'

export class GetGuardiansUseCase {
  constructor(private readonly guardianRepository: GuardianRepository) {}

  execute(): Promise<Guardian[]> {
    return this.guardianRepository.getGuardians()
  }
}
