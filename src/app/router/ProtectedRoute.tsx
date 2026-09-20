import { Outlet } from 'react-router-dom'

// Hoy no hay backend de autenticación (rule 29): MockAuthRepository siempre
// resuelve una sesión, así que este guard todavía no redirige a nadie. Se
// deja como punto de extensión: cuando exista login real, alcanza con leer
// la sesión acá (vía useAuth) y redirigir si no hay una válida, sin tocar
// ninguna otra pantalla ni ruta.
export function ProtectedRoute() {
  return <Outlet />
}
