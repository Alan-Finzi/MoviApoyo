// Todas las rutas de la aplicación en un único lugar (rule 24). Ningún
// componente debería escribir un path a mano.
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  TRIPS: '/traslados',
  TRIP_DETAIL: '/traslados/:id',
  DRIVERS: '/choferes',
  DRIVER_DETAIL: '/choferes/:id',
  VEHICLES: '/vehiculos',
  // "Paciente" es el término que usa el negocio para el niño trasladado
  // (rule del dominio de MoviApoyo). La entidad en el código sigue
  // llamándose Passenger — esto es solo la ruta/etiqueta visible.
  PASSENGERS: '/pacientes',
  PASSENGER_DETAIL: '/pacientes/:id',
  NOTIFICATIONS: '/notificaciones',
  INCIDENTS: '/incidentes',
  SETTINGS: '/configuracion',
  NOTIFICATION_SETTINGS: '/configuracion/notificaciones',
} as const

export function buildTripDetailRoute(tripId: string): string {
  return `/traslados/${tripId}`
}

export function buildDriverDetailRoute(driverId: string): string {
  return `/choferes/${driverId}`
}

export function buildPassengerDetailRoute(passengerId: string): string {
  return `/pacientes/${passengerId}`
}
