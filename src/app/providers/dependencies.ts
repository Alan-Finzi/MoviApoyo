import { env } from '@/app/config/env'
import { CheckTripProximityUseCase } from '@/application/useCases/CheckTripProximityUseCase'
import { GetDashboardSummaryUseCase } from '@/application/useCases/GetDashboardSummaryUseCase'
import { GetDriverByIdUseCase } from '@/application/useCases/GetDriverByIdUseCase'
import { GetDriversUseCase } from '@/application/useCases/GetDriversUseCase'
import { GetGuardiansUseCase } from '@/application/useCases/GetGuardiansUseCase'
import { GetIncidentsUseCase } from '@/application/useCases/GetIncidentsUseCase'
import { GetNotificationSettingsUseCase } from '@/application/useCases/GetNotificationSettingsUseCase'
import { GetNotificationsByPassengerUseCase } from '@/application/useCases/GetNotificationsByPassengerUseCase'
import { GetNotificationsUseCase } from '@/application/useCases/GetNotificationsUseCase'
import { GetPassengerByIdUseCase } from '@/application/useCases/GetPassengerByIdUseCase'
import { GetPassengerSensitiveInfoUseCase } from '@/application/useCases/GetPassengerSensitiveInfoUseCase'
import { GetPassengersUseCase } from '@/application/useCases/GetPassengersUseCase'
import { GetScheduleRecommendationUseCase } from '@/application/useCases/GetScheduleRecommendationUseCase'
import { GetTripByIdUseCase } from '@/application/useCases/GetTripByIdUseCase'
import { GetTripMapDataUseCase } from '@/application/useCases/GetTripMapDataUseCase'
import { GetTripsByDriverUseCase } from '@/application/useCases/GetTripsByDriverUseCase'
import { GetTripsByPassengerUseCase } from '@/application/useCases/GetTripsByPassengerUseCase'
import { GetTripsUseCase } from '@/application/useCases/GetTripsUseCase'
import { GetVehicleByIdUseCase } from '@/application/useCases/GetVehicleByIdUseCase'
import { GetVehicleLocationUseCase } from '@/application/useCases/GetVehicleLocationUseCase'
import { GetVehiclesUseCase } from '@/application/useCases/GetVehiclesUseCase'
import { RegisterDriverUseCase } from '@/application/useCases/RegisterDriverUseCase'
import { RegisterIncidentUseCase } from '@/application/useCases/RegisterIncidentUseCase'
import { RegisterPassengerUseCase } from '@/application/useCases/RegisterPassengerUseCase'
import { RegisterTripUseCase } from '@/application/useCases/RegisterTripUseCase'
import { RegisterVehicleUseCase } from '@/application/useCases/RegisterVehicleUseCase'
import { SendNotificationUseCase } from '@/application/useCases/SendNotificationUseCase'
import { StartTripUseCase } from '@/application/useCases/StartTripUseCase'
import { UpdateNotificationSettingsUseCase } from '@/application/useCases/UpdateNotificationSettingsUseCase'
import { UpdateTripStatusUseCase } from '@/application/useCases/UpdateTripStatusUseCase'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import type { GuardianRepository } from '@/domain/repositories/GuardianRepository'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { ApiClient } from '@/infrastructure/api/ApiClient'
import { getFirebaseAuth, getFirebaseFirestore } from '@/infrastructure/firebase/firebaseApp'
import { FirestoreAuthRepository } from '@/infrastructure/firebase/repositories/FirestoreAuthRepository'
import { FirestoreDriverRepository } from '@/infrastructure/firebase/repositories/FirestoreDriverRepository'
import { FirestoreGuardianRepository } from '@/infrastructure/firebase/repositories/FirestoreGuardianRepository'
import { FirestoreIncidentRepository } from '@/infrastructure/firebase/repositories/FirestoreIncidentRepository'
import { FirestoreNotificationRepository } from '@/infrastructure/firebase/repositories/FirestoreNotificationRepository'
import { FirestoreNotificationSettingsRepository } from '@/infrastructure/firebase/repositories/FirestoreNotificationSettingsRepository'
import { FirestorePassengerRepository } from '@/infrastructure/firebase/repositories/FirestorePassengerRepository'
import { FirestoreTripRepository } from '@/infrastructure/firebase/repositories/FirestoreTripRepository'
import { FirestoreVehicleRepository } from '@/infrastructure/firebase/repositories/FirestoreVehicleRepository'
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
// concreta (Mock o Firestore) usa cada interfaz de Domain, y arma los Use
// Cases inyectándosela. Ninguna pantalla ni hook debería instanciar un
// repositorio o servicio por su cuenta.
//
// apiClient queda listo para el día que haga falta un backend HTTP propio
// además de Firestore (rule 22); hoy no lo usa ningún repositorio.
export const apiClient = new ApiClient({ baseUrl: env.apiBaseUrl })

// Selección de implementación por entorno (rule: "nuestro backend estará
// hecho en Firebase"): si hay un proyecto de Firebase configurado
// (VITE_FIREBASE_PROJECT_ID), se usan los repositorios de Firestore; si no,
// la app sigue funcionando con los Mock en memoria, sin que nadie tenga que
// tocar código para levantarla localmente. Ver docs/firebase.md.
//
let tripRepositoryImpl: TripRepository
let driverRepositoryImpl: DriverRepository
let vehicleRepositoryImpl: VehicleRepository
let passengerRepositoryImpl: PassengerRepository
let guardianRepositoryImpl: GuardianRepository
let incidentRepositoryImpl: IncidentRepository
let notificationRepositoryImpl: NotificationRepository
let notificationSettingsRepositoryImpl: NotificationSettingsRepository

if (env.isFirebaseConfigured) {
  const firestore = getFirebaseFirestore()
  tripRepositoryImpl = new FirestoreTripRepository(firestore)
  driverRepositoryImpl = new FirestoreDriverRepository(firestore)
  vehicleRepositoryImpl = new FirestoreVehicleRepository(firestore)
  passengerRepositoryImpl = new FirestorePassengerRepository(firestore)
  guardianRepositoryImpl = new FirestoreGuardianRepository(firestore)
  incidentRepositoryImpl = new FirestoreIncidentRepository(firestore)
  notificationRepositoryImpl = new FirestoreNotificationRepository(firestore)
  notificationSettingsRepositoryImpl = new FirestoreNotificationSettingsRepository(firestore)
} else {
  tripRepositoryImpl = new MockTripRepository()
  driverRepositoryImpl = new MockDriverRepository()
  vehicleRepositoryImpl = new MockVehicleRepository()
  passengerRepositoryImpl = new MockPassengerRepository()
  guardianRepositoryImpl = new MockGuardianRepository()
  incidentRepositoryImpl = new MockIncidentRepository()
  notificationRepositoryImpl = new MockNotificationRepository()
  notificationSettingsRepositoryImpl = new MockNotificationSettingsRepository()
}

// Exportados (no solo `const` privadas) porque, además de alimentar los Use
// Cases de acá abajo, algunos hooks de Presentation se suscriben a ellos
// directamente para saber cuándo refrescar datos que cambian en vivo (por
// la simulación en modo Mock, o por escrituras reales en modo Firestore).
export const tripRepository = tripRepositoryImpl
const driverRepository = driverRepositoryImpl
const vehicleRepository = vehicleRepositoryImpl
const passengerRepository = passengerRepositoryImpl
const guardianRepository = guardianRepositoryImpl
const incidentRepository = incidentRepositoryImpl
export const notificationRepository = notificationRepositoryImpl
const notificationSettingsRepository = notificationSettingsRepositoryImpl
// El rol de cada usuario de staff vive en Firestore (/admins/{uid}, ver
// docs/firebase.md) — por eso, a diferencia del resto de los repositorios,
// FirestoreAuthRepository necesita tanto Auth como Firestore.
export const authRepository: AuthRepository = env.isFirebaseConfigured
  ? new FirestoreAuthRepository(getFirebaseAuth(), getFirebaseFirestore())
  : new MockAuthRepository()

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

const getTripsUseCase = new GetTripsUseCase(
  tripRepository,
  passengerRepository,
  driverRepository,
  vehicleRepository,
)
const getTripsByPassengerUseCase = new GetTripsByPassengerUseCase(getTripsUseCase)

export const useCases = {
  getTrips: getTripsUseCase,
  getTripsByPassenger: getTripsByPassengerUseCase,
  getTripsByDriver: new GetTripsByDriverUseCase(getTripsUseCase),
  getNotificationsByPassenger: new GetNotificationsByPassengerUseCase(
    getTripsByPassengerUseCase,
    notificationRepository,
  ),
  getScheduleRecommendation: new GetScheduleRecommendationUseCase(tripRepository),
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
  getDriverById: new GetDriverByIdUseCase(driverRepository),
  registerDriver: new RegisterDriverUseCase(driverRepository),
  getVehicles: new GetVehiclesUseCase(vehicleRepository),
  getVehicleById: new GetVehicleByIdUseCase(vehicleRepository),
  registerVehicle: new RegisterVehicleUseCase(vehicleRepository),
  getPassengers: new GetPassengersUseCase(passengerRepository),
  getPassengerById: new GetPassengerByIdUseCase(passengerRepository),
  registerPassenger: new RegisterPassengerUseCase(passengerRepository),
  registerTrip: new RegisterTripUseCase(tripRepository, passengerRepository),
  getGuardians: new GetGuardiansUseCase(guardianRepository),
  getPassengerSensitiveInfo: new GetPassengerSensitiveInfoUseCase(passengerRepository),
  getIncidents: new GetIncidentsUseCase(incidentRepository),
  getDashboardSummary: new GetDashboardSummaryUseCase(tripRepository, vehicleRepository),
}

// Motor de simulación (rule 46/48): se arranca una única vez desde la raíz
// de la aplicación (ver App.tsx) para que avance los traslados activos sin
// importar qué pantalla esté mirando el usuario. Sigue siendo útil incluso
// en modo Firestore mientras no haya choferes reales enviando su ubicación
// por WhatsApp (ver docs/whatsapp-bot.md).
export const tripSimulationEngine = new TripSimulationEngine(
  tripRepository,
  distanceService,
  locationService,
  checkTripProximityUseCase,
  updateTripStatusUseCase,
)
