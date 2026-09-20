// Criterio configurable para decidir cuándo avisar a un padre/tutor que el
// vehículo se acerca: por distancia recorrida o por tiempo estimado de
// llegada (rule 8). No se asume de antemano cuál es "mejor".
export const ProximityCriterion = {
  DISTANCE: 'DISTANCIA',
  TIME: 'TIEMPO',
} as const

export type ProximityCriterion = (typeof ProximityCriterion)[keyof typeof ProximityCriterion]
