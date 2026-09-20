# Mapa

## Abstracción

`domain/services/MapService.ts` define el contrato:

```ts
interface MapService {
  getMapViewData(tripId: string): Promise<MapViewData>
}
```

`MapViewData` trae origen, destino, ubicación actual del vehículo, puntos de
recorrido, y la distancia/ETA hacia el próximo punto relevante (domicilio o
destino, según en qué tramo está el traslado).

## Implementación actual

`infrastructure/maps/MockMapProvider.ts` no dibuja un mapa geográfico real:
resuelve `MapViewData` a partir del `Trip` (usando `HaversineDistanceService`
para la distancia). `presentation/components/MapContainer.tsx` proyecta esas
coordenadas sobre un plano simple con SVG — origen, vehículo y destino como
puntos, la ruta como una línea — y un panel con Estado / ETA / Distancia /
Última actualización.

Esto cumple lo pedido en el enunciado ("no es necesario implementar
inicialmente un proveedor real de mapas") sin dejar nada simulado a medias:
la distancia y el ETA que se muestran son cálculos reales sobre las
coordenadas que trae el traslado, aunque esas coordenadas todavía sean
ficticias.

## Cómo conectar un proveedor real

1. Elegir librería. Alternativas evaluadas:
   - **Leaflet** (recomendada para arrancar): open source, no requiere API
     key, liviana. Buena opción por defecto.
   - **Google Maps**: mejor calidad de datos y de ruteo real, pero requiere
     facturación y una API key.
   - **Mapbox**: similar a Google en capacidades, con un tier gratuito más
     generoso.
2. Crear `infrastructure/maps/LeafletMapProvider.ts` (o el que corresponda)
   implementando `MapService`. Puede seguir devolviendo la misma forma de
   `MapViewData`, o ampliarla si el proveedor ofrece ruteo real por calles
   (en cuyo caso `routePoints` pasaría a tener más puntos intermedios).
3. Crear el componente de presentación equivalente a `MapContainer` que use
   la librería elegida (ej. `react-leaflet`), respetando la misma interfaz de
   props (o adaptando `MapContainer` para que renderice uno u otro según
   `env.mapProvider`).
4. En `app/providers/dependencies.ts`, reemplazar la instancia de
   `MockMapProvider` por la nueva, eligiendo según `env.mapProvider`
   (`VITE_MAP_PROVIDER`).
5. Cargar `VITE_MAP_API_KEY` desde `.env` cuando el proveedor lo requiera
   (Google Maps, Mapbox) — nunca hardcodeada en el código.

Ninguna pantalla (`TripDetailPage`, etc.) necesita cambiar: todas consumen
`MapViewData` a través de `GetTripMapDataUseCase`, no la implementación
concreta del proveedor.
