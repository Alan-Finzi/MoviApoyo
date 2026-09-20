import { describe, expect, it } from 'vitest'

import { HaversineDistanceService } from './HaversineDistanceService'

describe('HaversineDistanceService', () => {
  const service = new HaversineDistanceService()

  it('devuelve 0 metros para el mismo punto', () => {
    const point = { latitude: -34.6, longitude: -58.4 }
    expect(service.calculateDistance(point, point).meters).toBe(0)
  })

  it('calcula una distancia aproximada correcta entre dos puntos conocidos', () => {
    // Obelisco (CABA) a la Plaza de La Plata: ~52 km en línea recta.
    const obelisco = { latitude: -34.6037, longitude: -58.3816 }
    const laPlata = { latitude: -34.9214, longitude: -57.9544 }
    const distance = service.calculateDistance(obelisco, laPlata)
    expect(distance.meters).toBeGreaterThan(45_000)
    expect(distance.meters).toBeLessThan(60_000)
  })

  it('estima los minutos de llegada en base a la velocidad promedio', () => {
    // A 60 km/h (1000 m/min), 1000 metros tardan 1 minuto.
    expect(service.estimateArrivalMinutes({ meters: 1000 }, 60)).toBeCloseTo(1, 5)
  })

  it('devuelve 0 minutos si la velocidad promedio es inválida', () => {
    expect(service.estimateArrivalMinutes({ meters: 1000 }, 0)).toBe(0)
  })
})
