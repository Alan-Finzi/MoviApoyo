import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import type { LocationService } from '@/domain/services/LocationService'

export class GetVehicleLocationUseCase {
  constructor(private readonly locationService: LocationService) {}

  execute(vehicleId: string): Promise<GeoCoordinates> {
    return this.locationService.getCurrentLocation(vehicleId)
  }
}
