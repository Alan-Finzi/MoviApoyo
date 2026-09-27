import type { Guardian } from '@/domain/entities/Guardian'
import { NotificationChannel } from '@/domain/enums/NotificationChannel'
import type { GuardianRepository } from '@/domain/repositories/GuardianRepository'
import { createPhoneNumber } from '@/domain/valueObjects/PhoneNumber'

export interface RegisterGuardianInput {
  readonly fullName: string
  readonly phone: string
  readonly relationship: string
}

// Alta de tutor desde el panel de admin (antes solo se podían elegir tutores
// ya cargados por seed — ver comentario viejo en PassengerForm). Arranca
// siempre notificado por WhatsApp, el único canal soportado hoy (ver
// NotificationChannel).
export class RegisterGuardianUseCase {
  constructor(private readonly guardianRepository: GuardianRepository) {}

  execute(input: RegisterGuardianInput): Promise<Guardian> {
    return this.guardianRepository.registerGuardian({
      fullName: input.fullName,
      phone: createPhoneNumber(input.phone),
      relationship: input.relationship,
      notificationChannels: [NotificationChannel.WHATSAPP],
    })
  }
}
