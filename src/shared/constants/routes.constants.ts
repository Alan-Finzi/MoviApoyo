// Todas las rutas de la aplicación en un único lugar (rule 24). Ningún
// componente debería escribir un path a mano.
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  TRIPS: '/traslados',
  TRIP_DETAIL: '/traslados/:id',
  DRIVERS: '/choferes',
  VEHICLES: '/vehiculos',
  PASSENGERS: '/pasajeros',
  NOTIFICATIONS: '/notificaciones',
  INCIDENTS: '/incidentes',
  SETTINGS: '/configuracion',
  NOTIFICATION_SETTINGS: '/configuracion/notificaciones',
  // Rutas planificadas para las futuras experiencias de padres y choferes
  // (rule 58 y 59). No se implementan todavía: solo se reserva el path.
  FAMILY: '/familia',
} as const

export function buildTripDetailRoute(tripId: string): string {
  return `/traslados/${tripId}`
}
