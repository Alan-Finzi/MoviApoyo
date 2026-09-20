import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'

import { AppRouter } from '@/app/router/AppRouter'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { tripSimulationEngine } from '@/app/providers/dependencies'
import { NotificationToastBridge } from '@/app/providers/NotificationToastBridge'
import { ToastProvider } from '@/presentation/components/ToastProvider'

// Composition root visual de la aplicación (rule 43): acá se arman, en
// orden, la sesión (AuthProvider), el router y los avisos flotantes. El
// motor de simulación arranca una única vez, sin importar qué pantalla esté
// mirando el usuario, para que los traslados avancen "en vivo" (rule 46/48).
function App() {
  useEffect(() => {
    tripSimulationEngine.start()
    return () => {
      tripSimulationEngine.stop()
    }
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationToastBridge />
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
