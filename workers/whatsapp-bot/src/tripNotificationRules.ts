import { TripStatus } from './tripStatusMachine'

// Espejo mínimo de src/domain/services/TripNotificationRules.ts (mismo
// criterio que tripStatusMachine.ts: este proyecto compila aparte, ver
// README de esta carpeta). Solo cubre los estados a los que se puede llegar
// desde este webhook (ver handleDriverMessage) — si TripNotificationRules
// agrega un mensaje para otro estado que el chofer también pueda disparar
// por WhatsApp, hay que traerlo acá a mano.
export function getGuardianNotificationMessage(
  status: TripStatus,
  childFirstName: string,
): string | null {
  switch (status) {
    case TripStatus.ARRIVING:
      return 'El vehículo está llegando al domicilio.'
    case TripStatus.PICKED_UP:
      return `${childFirstName} ya fue recogido y comenzó su traslado.`
    case TripStatus.IN_TRANSIT:
      return `${childFirstName} se encuentra en camino.`
    case TripStatus.COMPLETED:
      return `${childFirstName} llegó correctamente al destino.`
    case TripStatus.NO_SHOW:
      return `El chofer llegó al domicilio pero ${childFirstName} no salió. Contactate con un coordinador si hace falta reprogramar el viaje.`
    default:
      return null
  }
}

export function getGuardianNotificationType(status: TripStatus): string {
  switch (status) {
    case TripStatus.PICKED_UP:
      return 'NINO_RECOGIDO'
    case TripStatus.COMPLETED:
      return 'NINO_ENTREGADO'
    case TripStatus.NO_SHOW:
      return 'PACIENTE_AUSENTE'
    default:
      return 'VEHICULO_ACERCANDOSE'
  }
}
