import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { LogOut, Menu, Moon, Sun } from 'lucide-react'

import { useAuth } from '@/app/providers/AuthProvider'
import { UserRole } from '@/domain/enums/UserRole'
import { IconButton } from '@/presentation/components/IconButton'
import { Select } from '@/presentation/components/Select'

import styles from './Topbar.module.css'

const ROLE_OPTIONS = [
  { value: UserRole.ADMIN, label: 'Administrador' },
  { value: UserRole.COORDINATOR, label: 'Coordinador' },
  { value: UserRole.DRIVER, label: 'Chofer' },
  { value: UserRole.PARENT, label: 'Padre/Tutor' },
]

type Theme = 'light' | 'dark'
const THEME_STORAGE_KEY = 'moviapoyo-theme'

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

interface TopbarProps {
  readonly onToggleSidebar: () => void
}

// El selector de rol es una herramienta de demo: solo aparece cuando
// authRepository es el Mock (sin Firebase configurado, ver AuthProvider),
// para poder probar las rutas con RoleGuard sin backend de autenticación.
// Con Firebase real (setDemoRole === null) se muestra el usuario autenticado
// y un botón para cerrar sesión. El toggle de tema demuestra que Dark Mode
// funciona con solo redefinir variables CSS.
export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user, setDemoRole, signOut } = useAuth()
  const [theme, setTheme] = useState<Theme | null>(() => readStoredTheme())

  useEffect(() => {
    if (!theme) {
      document.documentElement.removeAttribute('data-theme')
      return
    }
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // localStorage puede no estar disponible (ej. modo privado); no es
      // crítico para el funcionamiento de la app.
    }
  }, [theme])

  function toggleTheme(): void {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  function handleRoleChange(event: ChangeEvent<HTMLSelectElement>): void {
    setDemoRole?.(event.target.value as UserRole)
  }

  return (
    <header className={styles.topbar}>
      <IconButton label="Abrir menú" className={styles.menuButton} onClick={onToggleSidebar}>
        <Menu size={20} aria-hidden="true" />
      </IconButton>

      <span className={styles.brandMobile}>MoviApoyo</span>

      <div className={styles.spacer} />

      {setDemoRole ? (
        <div className={styles.roleSwitcher}>
          <Select
            label="Ver como"
            name="role"
            value={user.role}
            onChange={handleRoleChange}
            options={ROLE_OPTIONS}
          />
        </div>
      ) : (
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.fullName}</span>
          <IconButton label="Cerrar sesión" onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
          </IconButton>
        </div>
      )}

      <IconButton
        label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )}
      </IconButton>
    </header>
  )
}
