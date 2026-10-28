import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { LoadingSpinner } from '../ui'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuthStore()

  // Still restoring session from localStorage / fetching /auth/me — don't redirect yet
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <LoadingSpinner label="Restoring session" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
