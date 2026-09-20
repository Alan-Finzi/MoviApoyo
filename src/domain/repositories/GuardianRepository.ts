import type { Guardian } from '@/domain/entities/Guardian'

export interface GuardianRepository {
  getGuardians(): Promise<Guardian[]>
  getGuardianById(id: string): Promise<Guardian>
}
