import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Car,
  LayoutDashboard,
  Settings,
  Truck,
  UserRound,
  Users,
} from 'lucide-react'

import { useAuth } from '@/app/providers/AuthProvider'
import { UserRole } from '@/domain/enums/UserRole'
import { ROUTES } from '@/shared/constants/routes.constants'
import { classNames } from '@/shared/utils/classNames'

import styles from './Sidebar.module.css'

interface NavItem {
  readonly to: string
  readonly label: string
  readonly icon: ReactNode
  readonly roles?: readonly UserRole[]
}

const OPERATIONS_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.COORDINATOR]

const NAV_ITEMS: readonly NavItem[] = [
  {
    to: ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} aria-hidden="true" />,
  },
  { to: ROUTES.TRIPS, label: 'Traslados', icon: <Car size={18} aria-hidden="true" /> },
  {
    to: ROUTES.DRIVERS,
    label: 'Choferes',
    icon: <UserRound size={18} aria-hidden="true" />,
    roles: OPERATIONS_ROLES,
  },
  {
    to: ROUTES.VEHICLES,
    label: 'Vehículos',
    icon: <Truck size={18} aria-hidden="true" />,
    roles: OPERATIONS_ROLES,
  },
  {
    to: ROUTES.PASSENGERS,
    label: 'Pasajeros',
    icon: <Users size={18} aria-hidden="true" />,
    roles: OPERATIONS_ROLES,
  },
  {
    to: ROUTES.NOTIFICATIONS,
    label: 'Notificaciones',
    icon: <Bell size={18} aria-hidden="true" />,
  },
  {
    to: ROUTES.INCIDENTS,
    label: 'Incidentes',
    icon: <AlertTriangle size={18} aria-hidden="true" />,
  },
  {
    to: ROUTES.NOTIFICATION_SETTINGS,
    label: 'Configuración',
    icon: <Settings size={18} aria-hidden="true" />,
  },
]

interface SidebarProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role))

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className={styles.backdrop}
          onClick={onClose}
          aria-label="Cerrar menú"
        />
      )}
      <aside
        className={classNames(styles.sidebar, isOpen && styles.sidebarOpen)}
        aria-label="Navegación principal"
      >
        <div className={styles.brand}>MoviApoyo</div>
        <nav className={styles.nav}>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                classNames(styles.navLink, isActive && styles.navLinkActive)
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
