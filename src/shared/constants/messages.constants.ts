// Plantillas de los mensajes que se envían al padre/tutor. Centralizarlas
// acá evita tener el mismo texto (con pequeñas variaciones) repetido en
// distintos casos de uso.
export const NOTIFICATION_MESSAGES = {
  approachingPickup: (childFirstName: string, approxBlocks: number): string => {
    const blocks = Math.max(1, Math.round(approxBlocks))
    const unit = blocks === 1 ? 'cuadra' : 'cuadras'
    return `El vehículo que trasladará a ${childFirstName} está a aproximadamente ${blocks} ${unit} de su domicilio.`
  },

  arrivingAtHome: (): string => 'El vehículo está llegando al domicilio.',

  pickedUp: (childFirstName: string): string =>
    `${childFirstName} ya fue recogido y comenzó su traslado.`,

  inTransit: (childFirstName: string): string => `${childFirstName} se encuentra en camino.`,

  delayed: (newEstimatedArrivalTime: string): string =>
    `El vehículo presenta una demora debido a un inconveniente técnico. El nuevo horario estimado de llegada es ${newEstimatedArrivalTime}.`,

  delivered: (childFirstName: string): string =>
    `${childFirstName} llegó correctamente al destino.`,
} as const
