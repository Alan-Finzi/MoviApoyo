import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import type { Driver } from '@/domain/entities/Driver'
import type { Guardian } from '@/domain/entities/Guardian'
import type { Incident } from '@/domain/entities/Incident'
import type { Passenger } from '@/domain/entities/Passenger'
import type { Trip } from '@/domain/entities/Trip'
import type { AuthenticatedUser } from '@/domain/entities/User'
import type { Vehicle } from '@/domain/entities/Vehicle'
import { UserRole } from '@/domain/enums/UserRole'
import { createStore } from '@/infrastructure/store/createStore'

import {
  defaultNotificationSettings,
  driversSeed,
  guardiansSeed,
  passengersSeed,
  tripsSeed,
  vehiclesSeed,
} from './fixtures/seedData'

// "Base de datos" en memoria. Al ser módulos de ES, cada store es un
// singleton: todas las pantallas y el motor de simulación leen/escriben el
// mismo estado durante la vida de la app. El día que exista backend, cada
// Mock*Repository se reemplaza por su *RepositoryApi sin tocar esta forma.
export const tripsStore = createStore<Trip[]>(tripsSeed)
export const driversStore = createStore<Driver[]>(driversSeed)
export const vehiclesStore = createStore<Vehicle[]>(vehiclesSeed)
export const passengersStore = createStore<Passenger[]>(passengersSeed)
export const guardiansStore = createStore<Guardian[]>(guardiansSeed)
export const incidentsStore = createStore<Incident[]>([])
export const notificationsStore = createStore<AppNotification[]>([])
export const notificationSettingsStore = createStore<NotificationSettings>(
  defaultNotificationSettings,
)

export const currentUserStore = createStore<AuthenticatedUser>({
  id: 'user-demo',
  fullName: 'Coordinador Demo',
  role: UserRole.COORDINATOR,
})
