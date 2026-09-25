import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import type { GeoCoordinates } from '@/domain/valueObjects/Address'

import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import styles from './LocationPickerMap.module.css'

// Leaflet arma la URL del ícono por defecto asumiendo una estructura de
// carpetas relativa que Vite no replica al empaquetar (queda roto, un
// cuadrado gris en vez del pin) — fix estándar: apuntar a mano a los assets
// ya resueltos por Vite.
const markerIconInstance = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface LocationPickerMapProps {
  readonly location: GeoCoordinates
  readonly onChange: (location: GeoCoordinates) => void
}

function ClickHandler({ onChange }: { readonly onChange: (location: GeoCoordinates) => void }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    },
  })
  return null
}

// El mapa vive dentro de un <dialog> (Modal): Leaflet mide el contenedor al
// montar, pero en ese momento el modal puede no haber terminado su layout
// final — sin esto, el mapa queda con tiles solo en una parte del recuadro
// (el tamaño viejo, más chico). El ResizeObserver fuerza un recálculo apenas
// el contenedor tiene su tamaño real.
function InvalidateSizeOnResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  return null
}

// Reemplaza los inputs de latitud/longitud a mano por un mapa real
// (OpenStreetMap, sin API key ni costo) donde tocar/hacer click deja el
// punto exacto. No usa MapService/MapProvider — eso es para el seguimiento
// en vivo de traslados (rule 4/33); esto es un control de formulario
// independiente y genérico.
export function LocationPickerMap({ location, onChange }: LocationPickerMapProps) {
  return (
    <div className={styles.wrapper}>
      <MapContainer
        center={[location.latitude, location.longitude]}
        zoom={13}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.latitude, location.longitude]} icon={markerIconInstance} />
        <ClickHandler onChange={onChange} />
        <InvalidateSizeOnResize />
      </MapContainer>
      <p className={styles.hint}>Tocá el mapa para marcar la ubicación exacta.</p>
    </div>
  )
}
