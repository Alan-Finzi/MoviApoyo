import { env } from '@/app/config/env'
import { CheckTripProximityUseCase } from '@/application/useCases/CheckTripProximityUseCase'
import { GetDashboardSummaryUseCase } from '@/application/useCases/GetDashboardSummaryUseCase'
import { GetDriversUseCase } from '@/application/useCases/GetDriversUseCase'
import { GetGuardiansUseCase } from '@/application/useCases/GetGuardiansUseCase'
import { GetIncidentsUseCase } from '@/application/useCases/GetIncidentsUseCase'
import { GetNotificationSettingsUseCase } from '@/application/useCases/GetNotificationSettingsUseCase'
import { GetNotificationsUseCase } from '@/application/useCases/GetNotificationsUseCase'
import { GetPassengerSensitiveInfoUseCase } from '@/application/useCases/GetPassengerSensitiveInfoUseCase'
import { GetPassengersUseCase } from '@/application/useCases/GetPassengersUseCase'
import { GetTripByIdUseCase } from '@/application/useCases/GetTripByIdUseCase'
import { GetTripMapDataUseCase } from '@/application/useCases/GetTripMapDataUseCase'
import { GetTripsUseCase } from '@/application/useCases/GetTripsUseCase'
import { GetVehicleLocationUseCase } from '@/application/useCases/GetVehicleLocationUseCase'
import { GetVehiclesUseCase } from '@/application/useCases/GetVehiclesUseCase'
import { RegisterIncidentUseCase } from '@/application/useCases/RegisterIncidentUseCase'
import { SendNotificationUseCase } from '@/application/useCases/SendNotificationUseCase'
import { StartTripUseCase } from '@/application/useCases/StartTripUseCase'
import { UpdateNotificationSettingsUseCase } from '@/application/useCases/UpdateNotificationSettingsUseCase'
import { UpdateTripStatusUseCase } from '@/application/useCases/UpdateTripStatusUseCase'
import { ApiClient } from '@/infrastructure/api/ApiClient'
import { MockMapProvider } from '@/infrastructure/maps/MockMapProvider'
import { MockNotificationService } from '@/infrastructure/notifications/MockNotificationService'
import { MockAuthRepository } from '@/infrastructure/repositories/MockAuthRepository'
import { MockDriverRepository } from '@/infrastructure/repositories/MockDriverRepository'
import { MockGuardianRepository } from '@/infrastructure/repositories/MockGuardianRepository'
import { MockIncidentRepository } from '@/infrastructure/repositories/MockIncidentRepository'
import { MockNotificationRepository } from '@/infrastructure/repositories/MockNotificationRepository'
import { MockNotificationSettingsRepository } from '@/infrastructure/repositories/MockNotificationSettingsRepository'
import { MockPassengerRepository } from '@/infrastructure/repositories/MockPassengerRepository'
import { MockTripRepository } from '@/infrastructure/repositories/MockTripRepository'
import { MockVehicleRepository } from '@/infrastructure/repositories/MockVehicleRepository'
import { HaversineDistanceService } from '@/infrastructure/services/HaversineDistanceService'
import { MockLocationService } from '@/infrastructure/services/MockLocationService'
import { TripSimulationEngine } from '@/infrastructure/services/TripSimulationEngine'

// Composition root (rule 21): el único archivo que sabe qué implementación
// concreta (Mock o Api) usa cada interfaz de Domain, y arma los Use Cases
// inyectándosela. Ninguna pantalla ni hook debería instanciar un
// repositorio o servicio por su cuenta.
//
// apiClient queda listo para el día que alguna implementación *RepositoryApi
// lo necesite (rule 22); hoy no lo usa ningún repositorio porque todos son
// Mock.
export const apiClient = new ApiClient({ baseUrl: env.apiBaseUrl })

// Exportados (no solo `const` privadas) porque, además de alimentar los Use
// Cases de acá abajo, algunos hooks de Presentation se suscriben a ellos
// directamente para saber cuándo refrescar datos que cambian en vivo por la
// simulación (ver TripRepository.subscribe / NotificationRepository.subscribe).
export const tripRepository = new MockTripRepository()
const driverRepository = new MockDriverRepository()
const vehicleRepository = new MockVehicleRepository()
const passengerRepository = new MockPassengerRepository()
const guardianRepository = new MockGuardianRepository()
const incidentRepository = new MockIncidentRepository()
export const notificationRepository = new MockNotificationRepository()
const notificationSettingsRepository = new MockNotificationSettingsRepository()
export const authRepository = new MockAuthRepository()

const notificationService = new MockNotificationService()
const distanceService = new HaversineDistanceService()
const locationService = new MockLocationService(tripRepository)
const mapService = new MockMapProvider(tripRepository, distanceService)

const sendNotificationUseCase = new SendNotificationUseCase(
  notificationService,
  notificationRepository,
)
const updateTripStatusUseCase = new UpdateTripStatusUseCase(
  tripRepository,
  passengerRepository,
  sendNotificationUseCase,
)
const checkTripProximityUseCase = new CheckTripProximityUseCase(
  tripRepository,
  passengerRepository,
  notificationSettingsRepository,
  sendNotificationUseCase,
)

export const useCases = {
  getTrips: new GetTripsUseCase(
    tripRepository,
    passengerRepository,
    driverRepository,
    vehicleRepository,
  ),
  getTripById: new GetTripByIdUseCase(
    tripRepository,
    passengerRepository,
    driverRepository,
    vehicleRepository,
    guardianRepository,
  ),
  startTrip: new StartTripUseCase(updateTripStatusUseCase),
  updateTripStatus: updateTripStatusUseCase,
  registerIncident: new RegisterIncidentUseCase(
    incidentRepository,
    tripRepository,
    passengerRepository,
    sendNotificationUseCase,
  ),
  getVehicleLocation: new GetVehicleLocationUseCase(locationService),
  getTripMapData: new GetTripMapDataUseCase(mapService),
  getNotifications: new GetNotificationsUseCase(notificationRepository),
  getNotificationSettings: new GetNotificationSettingsUseCase(notificationSettingsRepository),
  updateNotificationSettings: new UpdateNotificationSettingsUseCase(notificationSettingsRepository),
  getDrivers: new GetDriversUseCase(driverRepository),
  getVehicles: new GetVehiclesUseCase(vehicleRepository),
  getPassengers: new GetPassengersUseCase(passengerRepository),
  getGuardians: new GetGuardiansUseCase(guardianRepository),
  getPassengerSensitiveInfo: new GetPassengerSensitiveInfoUseCase(passengerRepository),
  getIncidents: new GetIncidentsUseCase(incidentRepository),
  getDashboardSummary: new GetDashboardSummaryUseCase(tripRepository, vehicleRepository),
}

// Motor de simulación (rule 46/48): se arranca una única vez desde la raíz
// de la aplicación (ver app/providers/AppProviders.tsx) para que avance los
// traslados activos sin importar qué pantalla esté mirando el usuario.
export const tripSimulationEngine = new TripSimulationEngine(
  tripRepository,
  distanceService,
  locationService,
  checkTripProximityUseCase,
  updateTripStatusUseCase,
)
