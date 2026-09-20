export interface GeoCoordinates {
  readonly latitude: number
  readonly longitude: number
}

export interface Address {
  readonly street: string
  readonly coordinates: GeoCoordinates
}
