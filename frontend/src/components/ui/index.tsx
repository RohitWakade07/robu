import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusColors: Record<string, string> = {
  idle: 'bg-steel-blue/10 text-pewter border-steel-blue/30',
  busy: 'bg-action-primary/10 text-action-primary border-action-primary/30',
  offline: 'bg-pewter/10 text-pewter border-pewter/30',
  error: 'bg-error/10 text-error border-error/30',
  charging: 'bg-action-primary/10 text-action-primary border-action-primary/30',
  pending: 'bg-amber/10 text-amber border-amber/30',
  confirmed: 'bg-cyan/10 text-cyan border-cyan/30',
  processing: 'bg-amber/10 text-amber border-amber/30',
  completed: 'bg-success/10 text-success border-success/30',
  failed: 'bg-error/10 text-error border-error/30',
  queued: 'bg-steel-blue/10 text-pewter border-steel-blue/30',
  registered: 'bg-cyan/10 text-cyan border-cyan/30',
  storing: 'bg-amber/10 text-amber border-amber/30',
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colorClass = statusColors[status.toLowerCase()] || statusColors.pending
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center rounded-full border font-medium capitalize ${colorClass} ${sizeClass}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: string
  accent?: 'cyan' | 'electric' | 'amber' | 'red'
}

const accentMap = {
  cyan: 'border-cyan/30 glow-cyan',
  electric: 'border-action-primary/30 glow-electric',
  amber: 'border-amber/30',
  red: 'border-error/30',
}

export function MetricCard({ label, value, icon, trend, accent = 'cyan' }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-xl p-5 border ${accentMap[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{label}</p>
          <p className="text-2xl font-semibold text-text-primary">{value}</p>
          {trend && <p className="text-xs text-text-secondary mt-1">{trend}</p>}
        </div>
        {icon && <div className="text-cyan opacity-80">{icon}</div>}
      </div>
    </motion.div>
  )
}

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  className?: string
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
}: ButtonProps) {
  const variants = {
    primary: 'bg-action-primary text-white border-action-primary hover:bg-action-primary/90',
    secondary: 'bg-action-secondary/10 text-action-secondary border-action-secondary/30 hover:bg-action-secondary/20',
    danger: 'bg-error/10 text-error border-error/30 hover:bg-error/20',
    ghost: 'bg-transparent text-text-secondary border-transparent hover:text-white hover:bg-bg-elevated',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  )
}

interface InputProps {
  label?: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function Input({ label, type = 'text', value, onChange, placeholder, required }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary/50 transition-colors"
      />
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-action-primary/30 border-t-action-primary" />
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 h-16 w-16 rounded-full bg-bg-elevated flex items-center justify-center border border-border-primary">
        <span className="text-2xl text-text-secondary opacity-40">∅</span>
      </div>
      <h3 className="text-lg font-medium text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-secondary max-w-sm">{description}</p>}
    </div>
  )
}

export * from './gooey-text-morphing'
