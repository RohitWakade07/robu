import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { Suspense, lazy, useEffect } from 'react'

import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'

import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { LoadingSpinner } from './components/ui'

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })))

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))

const WarehousesPage = lazy(() => import('./pages/warehouses/WarehousesPage').then((m) => ({ default: m.WarehousesPage })))
const RacksPage = lazy(() => import('./pages/warehouses/RacksPage').then((m) => ({ default: m.RacksPage })))
const WarehouseMapPage = lazy(() => import('./pages/warehouses/WarehouseMapPage').then((m) => ({ default: m.WarehouseMapPage })))
const ZonesPage = lazy(() => import('./pages/warehouses/ZonesPage').then((m) => ({ default: m.ZonesPage })))

const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ProductsPage = lazy(() => import('./pages/inventory/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const CategoriesPage = lazy(() => import('./pages/inventory/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const StockMovementsPage = lazy(() => import('./pages/inventory/StockMovementsPage').then((m) => ({ default: m.StockMovementsPage })))

const OrdersPage = lazy(() => import('./pages/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const PickingPage = lazy(() => import('./pages/orders/PickingPage').then((m) => ({ default: m.PickingPage })))
const ShippingPage = lazy(() => import('./pages/orders/ShippingPage').then((m) => ({ default: m.ShippingPage })))

const RobotsPage = lazy(() => import('./pages/robots/RobotsPage').then((m) => ({ default: m.RobotsPage })))
const RobotTasksPage = lazy(() => import('./pages/robots/RobotTasksPage').then((m) => ({ default: m.RobotTasksPage })))
const RobotFleetPage = lazy(() => import('./pages/robots/RobotFleetPage').then((m) => ({ default: m.RobotFleetPage })))
const RobotLogsPage = lazy(() => import('./pages/robots/RobotLogsPage').then((m) => ({ default: m.RobotLogsPage })))

const SlottingPage = lazy(() => import('./pages/slotting/SlottingPage').then((m) => ({ default: m.SlottingPage })))
const RecommendationsPage = lazy(() => import('./pages/slotting/RecommendationsPage').then((m) => ({ default: m.RecommendationsPage })))
const DemandAnalyticsPage = lazy(() => import('./pages/slotting/DemandAnalyticsPage').then((m) => ({ default: m.DemandAnalyticsPage })))
const OptimizationHistoryPage = lazy(() => import('./pages/slotting/OptimizationHistoryPage').then((m) => ({ default: m.OptimizationHistoryPage })))

const AnalyticsDashboardPage = lazy(() => import('./pages/analytics/AnalyticsDashboardPage').then((m) => ({ default: m.AnalyticsDashboardPage })))
const ReportsPage = lazy(() => import('./pages/analytics/ReportsPage').then((m) => ({ default: m.ReportsPage })))

const UsersPage = lazy(() => import('./pages/settings/UsersPage').then((m) => ({ default: m.UsersPage })))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function RoleGate({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role)
  if (!role || !roles.includes(role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

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
      <MotionConfig reducedMotion="user">
      <ThemeInitializer>
        <AuthInitializer>
          <BrowserRouter>
            <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner label="Loading page" />}>
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
                <Route path="/warehouses" element={<RoleGate roles={['administrator', 'warehouse_operator']}><WarehousesPage /></RoleGate>} />
                <Route path="/racks" element={<RoleGate roles={['administrator', 'warehouse_operator']}><RacksPage /></RoleGate>} />
                <Route path="/warehouse-map" element={<RoleGate roles={['administrator', 'warehouse_operator']}><WarehouseMapPage /></RoleGate>} />
                <Route path="/zones" element={<RoleGate roles={['administrator', 'warehouse_operator']}><ZonesPage /></RoleGate>} />

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
                <Route path="/robots" element={<RoleGate roles={['administrator', 'warehouse_operator']}><RobotsPage /></RoleGate>} />
                <Route path="/robot-tasks" element={<RoleGate roles={['administrator', 'warehouse_operator']}><RobotTasksPage /></RoleGate>} />
                <Route path="/robot-fleet" element={<RoleGate roles={['administrator', 'warehouse_operator']}><RobotFleetPage /></RoleGate>} />
                <Route path="/robot-logs" element={<RoleGate roles={['administrator', 'warehouse_operator']}><RobotLogsPage /></RoleGate>} />

                {/* Optimization Domain */}
                <Route path="/slotting" element={<RoleGate roles={['administrator', 'warehouse_operator']}><SlottingPage /></RoleGate>} />
                <Route path="/slotting/recommendations" element={<RoleGate roles={['administrator', 'warehouse_operator']}><RecommendationsPage /></RoleGate>} />
                <Route path="/analytics/demand" element={<RoleGate roles={['administrator', 'warehouse_operator']}><DemandAnalyticsPage /></RoleGate>} />
                <Route path="/optimization/history" element={<RoleGate roles={['administrator', 'warehouse_operator']}><OptimizationHistoryPage /></RoleGate>} />

                {/* Analytics & Reports Domain */}
                <Route path="/analytics" element={<RoleGate roles={['administrator']}><AnalyticsDashboardPage /></RoleGate>} />
                <Route path="/reports" element={<RoleGate roles={['administrator']}><ReportsPage /></RoleGate>} />

                {/* Administration Domain */}
                <Route path="/users" element={<RoleGate roles={['administrator']}><UsersPage /></RoleGate>} />
                <Route path="/settings" element={<RoleGate roles={['administrator']}><SettingsPage /></RoleGate>} />

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
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthInitializer>
      </ThemeInitializer>
      </MotionConfig>
    </QueryClientProvider>
  )
}
