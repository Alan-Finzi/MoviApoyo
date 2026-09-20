import { DriverStatus } from '@/domain/enums/DriverStatus'
import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import { TripStatus } from '@/domain/enums/TripStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { Driver } from '@/domain/entities/Driver'
import type { Guardian } from '@/domain/entities/Guardian'
import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { Trip } from '@/domain/entities/Trip'
import type { Vehicle } from '@/domain/entities/Vehicle'
import { NotificationChannel } from '@/domain/enums/NotificationChannel'
import { createLicensePlate } from '@/domain/valueObjects/LicensePlate'
import { createPhoneNumber } from '@/domain/valueObjects/PhoneNumber'
import { DEFAULT_BLOCK_LENGTH_METERS } from '@/shared/constants/app.constants'

// Datos de ejemplo para que la aplicación funcione de punta a punta sin
// backend (rule 26). Las direcciones y coordenadas son ficticias.
//
// NOTA: por simplicidad, los horarios se calculan con el reloj local del
// navegador (no con America/Argentina/Buenos_Aires); el formateo para
// mostrarlos en pantalla sí usa siempre esa zona horaria fija (ver
// shared/utils/date.ts), que es el único lugar que importa en producción.
function todayAt(hours: number, minutes: number): string {
  const now = new Date()
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0,
  ).toISOString()
}

export const guardiansSeed: Guardian[] = [
  {
    id: 'guardian-1',
    fullName: 'María Gómez',
    phone: createPhoneNumber('+5493511234567'),
    relationship: 'Madre',
    notificationChannels: [NotificationChannel.WHATSAPP],
  },
  {
    id: 'guardian-2',
    fullName: 'Carlos Díaz',
    phone: createPhoneNumber('+5493517654321'),
    relationship: 'Padre',
    notificationChannels: [NotificationChannel.WHATSAPP],
  },
  {
    id: 'guardian-3',
    fullName: 'Laura Fernández',
    phone: createPhoneNumber('+5493512223344'),
    relationship: 'Madre',
    notificationChannels: [NotificationChannel.WHATSAPP],
  },
  {
    id: 'guardian-4',
    fullName: 'Jorge Ramírez',
    phone: createPhoneNumber('+5493515556677'),
    relationship: 'Padre',
    notificationChannels: [NotificationChannel.WHATSAPP],
  },
]

const SCHOOL_ADDRESS = {
  street: 'Escuela Especial N°12, Av. Colón 2400',
  coordinates: { latitude: -34.618, longitude: -58.39 },
}

export const passengersSeed: Passenger[] = [
  {
    id: 'passenger-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    homeAddress: {
      street: 'Av. Rivadavia 1234',
      coordinates: { latitude: -34.605, longitude: -58.382 },
    },
    destinationAddress: SCHOOL_ADDRESS,
    guardianId: 'guardian-1',
  },
  {
    id: 'passenger-2',
    firstName: 'Sofía',
    lastName: 'Díaz',
    homeAddress: {
      street: 'Calle Lavalle 900',
      coordinates: { latitude: -34.595, longitude: -58.4 },
    },
    destinationAddress: {
      street: 'Centro de Día Los Álamos, Bv. San Juan 550',
      coordinates: { latitude: -34.61, longitude: -58.41 },
    },
    guardianId: 'guardian-2',
  },
  {
    id: 'passenger-3',
    firstName: 'Mateo',
    lastName: 'Fernández',
    homeAddress: {
      street: 'Pasaje Los Andes 45',
      coordinates: { latitude: -34.63, longitude: -58.37 },
    },
    destinationAddress: SCHOOL_ADDRESS,
    guardianId: 'guardian-3',
  },
  {
    id: 'passenger-4',
    firstName: 'Valentina',
    lastName: 'Ramírez',
    homeAddress: {
      street: 'Calle Belgrano 210',
      coordinates: { latitude: -34.58, longitude: -58.395 },
    },
    destinationAddress: {
      street: 'Centro de Día Los Álamos, Bv. San Juan 550',
      coordinates: { latitude: -34.61, longitude: -58.41 },
    },
    guardianId: 'guardian-4',
  },
]

export const passengerSensitiveInfoSeed: Record<string, PassengerSensitiveInfo> = {
  'passenger-1': {
    passengerId: 'passenger-1',
    documentNumber: '45123456',
    medicalNotes: 'Requiere silla de ruedas plegable, se traslada en el asiento trasero.',
    observations: 'Le gusta que lo saluden por su nombre al subir al vehículo.',
  },
  'passenger-2': {
    passengerId: 'passenger-2',
    documentNumber: '46234567',
    observations: 'Viaja siempre con su mochila de comunicación.',
  },
  'passenger-3': {
    passengerId: 'passenger-3',
    documentNumber: '47345678',
    medicalNotes: 'Alergia a frutos secos.',
  },
  'passenger-4': {
    passengerId: 'passenger-4',
    documentNumber: '48456789',
  },
}

export const driversSeed: Driver[] = [
  {
    id: 'driver-1',
    firstName: 'Carlos',
    lastName: 'Gómez',
    phone: createPhoneNumber('+5493511112233'),
    assignedVehicleId: 'vehicle-1',
    status: DriverStatus.ON_TRIP,
  },
  {
    id: 'driver-2',
    firstName: 'Ana',
    lastName: 'Torres',
    phone: createPhoneNumber('+5493514445566'),
    assignedVehicleId: 'vehicle-2',
    status: DriverStatus.AVAILABLE,
  },
  {
    id: 'driver-3',
    firstName: 'Roberto',
    lastName: 'Silva',
    phone: createPhoneNumber('+5493517778899'),
    assignedVehicleId: 'vehicle-3',
    status: DriverStatus.AVAILABLE,
  },
]

export const vehiclesSeed: Vehicle[] = [
  {
    id: 'vehicle-1',
    licensePlate: createLicensePlate('ABC123'),
    brand: 'Ford',
    model: 'Transit',
    year: 2021,
    status: VehicleStatus.IN_SERVICE,
    assignedDriverId: 'driver-1',
    fuelLevelPercentage: 68,
    odometerKm: 82_450,
  },
  {
    id: 'vehicle-2',
    licensePlate: createLicensePlate('AB123CD'),
    brand: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2022,
    status: VehicleStatus.AVAILABLE,
    assignedDriverId: 'driver-2',
    fuelLevelPercentage: 91,
    odometerKm: 41_200,
  },
  {
    id: 'vehicle-3',
    licensePlate: createLicensePlate('DEF456'),
    brand: 'Renault',
    model: 'Kangoo',
    year: 2020,
    status: VehicleStatus.AVAILABLE,
    assignedDriverId: 'driver-3',
    fuelLevelPercentage: 54,
    odometerKm: 103_780,
  },
  {
    id: 'vehicle-4',
    licensePlate: createLicensePlate('GHI789'),
    brand: 'Fiat',
    model: 'Ducato',
    year: 2019,
    status: VehicleStatus.IN_MAINTENANCE,
    assignedDriverId: null,
    fuelLevelPercentage: 12,
    odometerKm: 156_300,
    notes: 'En taller por revisión de frenos, vuelve a estar disponible el viernes.',
  },
]

export const tripsSeed: Trip[] = [
  {
    id: 'trip-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: passengersSeed[0]!.homeAddress,
    destination: passengersSeed[0]!.destinationAddress,
    scheduledDeparture: todayAt(8, 0),
    estimatedArrival: todayAt(8, 40),
    status: TripStatus.ON_THE_WAY,
    delayMinutes: 0,
    // Punto de partida a ~1,3 km del domicilio: TripSimulationEngine lo irá
    // acercando en cada tick (rule 47/48).
    currentLocation: { latitude: -34.598, longitude: -58.378 },
    events: [
      {
        id: 'event-1',
        tripId: 'trip-1',
        type: 'PROGRAMADO',
        timestamp: todayAt(7, 45),
        description: 'Traslado programado.',
        actor: 'Sistema',
      },
      {
        id: 'event-2',
        tripId: 'trip-1',
        type: 'CHOFER_INICIO_RECORRIDO',
        timestamp: todayAt(8, 0),
        description: 'Traslado actualizado a "Chofer en camino".',
        actor: 'Sistema',
      },
    ],
    notifiedMilestones: [],
  },
  {
    id: 'trip-2',
    passengerId: 'passenger-2',
    driverId: 'driver-2',
    vehicleId: 'vehicle-2',
    origin: passengersSeed[1]!.homeAddress,
    destination: passengersSeed[1]!.destinationAddress,
    scheduledDeparture: todayAt(9, 15),
    estimatedArrival: todayAt(9, 50),
    status: TripStatus.SCHEDULED,
    delayMinutes: 0,
    currentLocation: null,
    events: [
      {
        id: 'event-3',
        tripId: 'trip-2',
        type: 'PROGRAMADO',
        timestamp: todayAt(8, 30),
        description: 'Traslado programado.',
        actor: 'Sistema',
      },
    ],
    notifiedMilestones: [],
  },
  {
    id: 'trip-3',
    passengerId: 'passenger-3',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: passengersSeed[2]!.homeAddress,
    destination: passengersSeed[2]!.destinationAddress,
    scheduledDeparture: todayAt(7, 0),
    estimatedArrival: todayAt(7, 35),
    status: TripStatus.COMPLETED,
    delayMinutes: 0,
    currentLocation: passengersSeed[2]!.destinationAddress.coordinates,
    events: [
      {
        id: 'event-4',
        tripId: 'trip-3',
        type: 'PROGRAMADO',
        timestamp: todayAt(6, 45),
        description: 'Traslado programado.',
        actor: 'Sistema',
      },
      {
        id: 'event-5',
        tripId: 'trip-3',
        type: 'NINO_ENTREGADO',
        timestamp: todayAt(7, 35),
        description: 'Traslado actualizado a "Entregado".',
        actor: 'Sistema',
      },
    ],
    notifiedMilestones: ['NEAR_PICKUP'],
  },
  {
    id: 'trip-4',
    passengerId: 'passenger-4',
    driverId: 'driver-3',
    vehicleId: 'vehicle-3',
    origin: passengersSeed[3]!.homeAddress,
    destination: passengersSeed[3]!.destinationAddress,
    scheduledDeparture: todayAt(8, 15),
    estimatedArrival: todayAt(8, 50),
    status: TripStatus.DELAYED,
    delayMinutes: 15,
    currentLocation: { latitude: -34.581, longitude: -58.396 },
    events: [
      {
        id: 'event-6',
        tripId: 'trip-4',
        type: 'PROGRAMADO',
        timestamp: todayAt(8, 0),
        description: 'Traslado programado.',
        actor: 'Sistema',
      },
      {
        id: 'event-7',
        tripId: 'trip-4',
        type: 'DEMORA_REGISTRADA',
        timestamp: todayAt(8, 20),
        description: 'Incidente registrado: Tránsito. Corte parcial en Av. Belgrano.',
        actor: 'Roberto Silva',
      },
    ],
    notifiedMilestones: [],
  },
]

export const defaultNotificationSettings: NotificationSettings = {
  criterion: ProximityCriterion.DISTANCE,
  distanceThresholdMeters: 300,
  timeThresholdMinutes: 5,
  blockLengthMeters: DEFAULT_BLOCK_LENGTH_METERS,
}
