import type { MapService, MapViewData } from '@/domain/services/MapService'

export class GetTripMapDataUseCase {
  constructor(private readonly mapService: MapService) {}

  execute(tripId: string): Promise<MapViewData> {
    return this.mapService.getMapViewData(tripId)
  }
}
