import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function HomeRedirect() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const routes: Record<string, string> = {
    customer: '/customer',
    warehouse_operator: '/operator',
    administrator: '/admin',
    system: '/admin',
  }

  return <Navigate to={routes[user.role] || '/login'} replace />
}
