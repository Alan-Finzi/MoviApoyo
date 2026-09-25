// Constantes generales de negocio que no ameritan su propio archivo. El
// nombre de la app y el resto de la configuración de entorno viven en
// app/config/env.ts (rule 23), no acá: shared no debe depender de app.
export const DEFAULT_AVERAGE_SPEED_KMH = 25
export const DEFAULT_BLOCK_LENGTH_METERS = 100

// Centro de referencia para los mapas de selección de ubicación cuando
// todavía no se marcó ningún punto — Córdoba Capital, zona de operación
// real de MoviApoyo.
export const DEFAULT_MAP_CENTER = { latitude: -31.4201, longitude: -64.1888 }
