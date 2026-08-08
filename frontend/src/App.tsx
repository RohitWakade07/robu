import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { PortalLayout } from './components/layout/PortalLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { HomeRedirect } from './pages/HomeRedirect'
import { LandingPage } from './pages/LandingPage'
import { CustomerProductsPage, CustomerOrdersPage } from './pages/customer/CustomerPortal'
import { WarehouseShipmentsPage, NewShipmentPage } from './pages/warehouse/WarehousePortal'
import {
  AdminOverviewPage,
  AdminRobotsPage,
  AdminInventoryPage,
  AdminOrdersPage,
} from './pages/admin/AdminPortal'
import { WMSLayout } from './pages/wms/WMSLayout'
import { SpatialScoringPage } from './pages/wms/SpatialScoringPage'
import { AnalyticsPage } from './pages/wms/AnalyticsPage'
import { OperatorPortal } from './pages/operator/OperatorPortal'

import { useThemeStore } from './stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  return <>{children}</>
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((s) => s.fetchUser)

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <AuthInitializer>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<HomeRedirect />} />
            <Route path="/" element={<LandingPage />} />

            <Route path="/wms" element={<WMSLayout />}>
              <Route index element={<SpatialScoringPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            <Route
              path="/customer"
              element={
                <ProtectedRoute allowedRoles={['customer', 'administrator']}>
                  <PortalLayout portal="customer" />
                </ProtectedRoute>
              }
            >
              <Route index element={<CustomerProductsPage />} />
              <Route path="orders" element={<CustomerOrdersPage />} />
            </Route>

            <Route
              path="/warehouse"
              element={
                <ProtectedRoute allowedRoles={['warehouse_operator', 'administrator']}>
                  <PortalLayout portal="warehouse" />
                </ProtectedRoute>
              }
            >
              <Route index element={<WarehouseShipmentsPage />} />
              <Route path="new" element={<NewShipmentPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <PortalLayout portal="admin" />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="robots" element={<AdminRobotsPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>

            <Route
              path="/operator"
              element={
                <ProtectedRoute allowedRoles={['warehouse_operator', 'administrator']}>
                  <PortalLayout portal="operator" />
                </ProtectedRoute>
              }
            >
              <Route index element={<OperatorPortal />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </AuthInitializer>
      </ThemeInitializer>
    </QueryClientProvider>
  )
}
