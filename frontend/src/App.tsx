import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'

import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'

import { LoginPage } from './pages/auth/LoginPage'
import { LandingPage } from './pages/LandingPage'

import { DashboardPage } from './pages/dashboard/DashboardPage'

import { WarehousesPage } from './pages/warehouses/WarehousesPage'
import { RacksPage } from './pages/warehouses/RacksPage'
import { WarehouseMapPage } from './pages/warehouses/WarehouseMapPage'
import { ZonesPage } from './pages/warehouses/ZonesPage'

import { InventoryPage } from './pages/inventory/InventoryPage'
import { ProductsPage } from './pages/inventory/ProductsPage'
import { CategoriesPage } from './pages/inventory/CategoriesPage'
import { StockMovementsPage } from './pages/inventory/StockMovementsPage'

import { OrdersPage } from './pages/orders/OrdersPage'
import { PickingPage } from './pages/orders/PickingPage'
import { ShippingPage } from './pages/orders/ShippingPage'

import { RobotsPage } from './pages/robots/RobotsPage'
import { RobotTasksPage } from './pages/robots/RobotTasksPage'
import { RobotFleetPage } from './pages/robots/RobotFleetPage'
import { RobotLogsPage } from './pages/robots/RobotLogsPage'

import { SlottingPage } from './pages/slotting/SlottingPage'
import { RecommendationsPage } from './pages/slotting/RecommendationsPage'
import { DemandAnalyticsPage } from './pages/slotting/DemandAnalyticsPage'
import { OptimizationHistoryPage } from './pages/slotting/OptimizationHistoryPage'

import { AnalyticsDashboardPage } from './pages/analytics/AnalyticsDashboardPage'
import { ReportsPage } from './pages/analytics/ReportsPage'

import { UsersPage } from './pages/settings/UsersPage'
import { SettingsPage } from './pages/settings/SettingsPage'

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
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<LandingPage />} />

              {/* Main Enterprise App Shell Layout */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['administrator', 'warehouse_operator', 'customer']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Warehouse Domain */}
                <Route path="/warehouses" element={<WarehousesPage />} />
                <Route path="/racks" element={<RacksPage />} />
                <Route path="/warehouse-map" element={<WarehouseMapPage />} />
                <Route path="/zones" element={<ZonesPage />} />

                {/* Inventory Domain */}
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/stock-movements" element={<StockMovementsPage />} />

                {/* Orders Domain */}
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/picking" element={<PickingPage />} />
                <Route path="/shipping" element={<ShippingPage />} />

                {/* Robotics Domain */}
                <Route path="/robots" element={<RobotsPage />} />
                <Route path="/robot-tasks" element={<RobotTasksPage />} />
                <Route path="/robot-fleet" element={<RobotFleetPage />} />
                <Route path="/robot-logs" element={<RobotLogsPage />} />

                {/* Optimization Domain */}
                <Route path="/slotting" element={<SlottingPage />} />
                <Route path="/slotting/recommendations" element={<RecommendationsPage />} />
                <Route path="/analytics/demand" element={<DemandAnalyticsPage />} />
                <Route path="/optimization/history" element={<OptimizationHistoryPage />} />

                {/* Analytics & Reports Domain */}
                <Route path="/analytics" element={<AnalyticsDashboardPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* Administration Domain */}
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Legacy Route Aliases & Redirects for backward compatibility */}
                <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
                <Route path="/operator/*" element={<Navigate to="/robot-fleet" replace />} />
                <Route path="/warehouse/*" element={<Navigate to="/shipping" replace />} />
                <Route path="/customer/*" element={<Navigate to="/products" replace />} />
                <Route path="/wms/*" element={<Navigate to="/slotting" replace />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthInitializer>
      </ThemeInitializer>
    </QueryClientProvider>
  )
}
