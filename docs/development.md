# Guía de desarrollo

## Requisitos

- Node.js 20+
- npm 10+

## Comandos

| Comando                | Qué hace                                           |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo (Vite) con HMR.             |
| `npm run build`        | Chequeo de tipos (`tsc -b`) + build de producción. |
| `npm run preview`      | Sirve el build de `dist/` localmente.              |
| `npm run lint`         | ESLint sobre todo el proyecto.                     |
| `npm run lint:fix`     | ESLint con autofix.                                |
| `npm run format`       | Prettier, escribe los cambios.                     |
| `npm run format:check` | Prettier en modo chequeo (usado en CI).            |
| `npm run test`         | Corre la suite de Vitest una vez.                  |
| `npm run test:watch`   | Vitest en modo watch.                              |

## Antes de abrir un PR / dar por terminado un cambio

1. `npm run lint` — cero errores (warnings de `react-refresh/only-export-components`
   en `AuthProvider.tsx` y `ToastProvider.tsx` son esperados: son archivos
   que exportan un Provider y su hook asociado a propósito).
2. `npm run test` — toda la suite en verde.
3. `npm run build` — sin errores de tipos ni de Vite.
4. Si tocaste una pantalla, probála en el navegador con `npm run dev`
   (mobile, tablet, desktop — ver breakpoints en
   `presentation/styles/tokens.css`).

## Depuración de la simulación

`TripSimulationEngine` (`infrastructure/services/TripSimulationEngine.ts`)
corre un `setInterval` cada 4 segundos que mueve los traslados activos y
dispara transiciones de estado y notificaciones. Para inspeccionar qué está
pasando:

- El `Logger` (`shared/utils/Logger.ts`) imprime cada notificación (mock)
  enviada, con el tipo y el id del traslado.
- Los datos "en memoria" viven en `infrastructure/repositories/stores.ts` —
  son singletons de módulo, así que persisten mientras la pestaña del
  navegador siga abierta (se resetean al recargar).

## Zona horaria y locale

Todo el formateo de fechas pasa por `shared/utils/date.ts`, fijado a
`America/Argentina/Buenos_Aires` y locale `es-AR`. Si alguna vez hace falta
soportar otra zona horaria (ej. multi-sucursal en otro país), ese es el único
archivo a tocar.

## Dark Mode

Las variables de `presentation/styles/tokens.css` ya tienen su versión oscura
(por `prefers-color-scheme` y por el atributo `data-theme` que alterna el
botón del Topbar, persistido en `localStorage`). Al crear un componente
nuevo, usar siempre las variables (`var(--color-...)`) y nunca un color
hardcodeado — así el modo oscuro sigue funcionando sin tocar ese componente.
