import { Navigate, Route, Routes } from 'react-router-dom'

import { UserRole } from '@/domain/enums/UserRole'
import { AppLayout } from '@/presentation/layouts/AppLayout'
import { DashboardPage } from '@/presentation/pages/dashboard/DashboardPage'
import { DriverDetailPage } from '@/presentation/pages/drivers/DriverDetailPage'
import { DriversPage } from '@/presentation/pages/drivers/DriversPage'
import { IncidentsPage } from '@/presentation/pages/incidents/IncidentsPage'
import { NotificationsPage } from '@/presentation/pages/notifications/NotificationsPage'
import { PassengerDetailPage } from '@/presentation/pages/passengers/PassengerDetailPage'
import { PassengersPage } from '@/presentation/pages/passengers/PassengersPage'
import { NotificationSettingsPage } from '@/presentation/pages/settings/NotificationSettingsPage'
import { TripDetailPage } from '@/presentation/pages/trips/TripDetailPage'
import { TripsListPage } from '@/presentation/pages/trips/TripsListPage'
import { VehiclesPage } from '@/presentation/pages/vehicles/VehiclesPage'
import { ROUTES } from '@/shared/constants/routes.constants'

import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard } from './RoleGuard'

const OPERATIONS_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.COORDINATOR]

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.TRIPS} element={<TripsListPage />} />
          <Route path={ROUTES.TRIP_DETAIL} element={<TripDetailPage />} />
          <Route
            path={ROUTES.DRIVERS}
            element={
              <RoleGuard allowedRoles={OPERATIONS_ROLES}>
                <DriversPage />
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.DRIVER_DETAIL}
            element={
              <RoleGuard allowedRoles={OPERATIONS_ROLES}>
                <DriverDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.VEHICLES}
            element={
              <RoleGuard allowedRoles={OPERATIONS_ROLES}>
                <VehiclesPage />
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.PASSENGERS}
            element={
              <RoleGuard allowedRoles={OPERATIONS_ROLES}>
                <PassengersPage />
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.PASSENGER_DETAIL}
            element={
              <RoleGuard allowedRoles={OPERATIONS_ROLES}>
                <PassengerDetailPage />
              </RoleGuard>
            }
          />
          <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
          <Route path={ROUTES.INCIDENTS} element={<IncidentsPage />} />
          <Route path={ROUTES.NOTIFICATION_SETTINGS} element={<NotificationSettingsPage />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
