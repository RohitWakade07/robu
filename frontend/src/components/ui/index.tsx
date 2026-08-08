import { motion, AnimatePresence } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { X, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusColors: Record<string, string> = {
  idle: 'bg-steel-blue/10 text-pewter border-steel-blue/30',
  busy: 'bg-action-primary/10 text-action-primary border-action-primary/30',
  offline: 'bg-pewter/10 text-pewter border-pewter/30',
  error: 'bg-error/10 text-error border-error/30',
  charging: 'bg-cyan/10 text-cyan border-cyan/30',
  working: 'bg-action-primary/10 text-action-primary border-action-primary/30',
  maintenance: 'bg-amber/10 text-amber border-amber/30',
  pending: 'bg-amber/10 text-amber border-amber/30',
  confirmed: 'bg-cyan/10 text-cyan border-cyan/30',
  processing: 'bg-amber/10 text-amber border-amber/30',
  completed: 'bg-success/10 text-success border-success/30',
  failed: 'bg-error/10 text-error border-error/30',
  queued: 'bg-steel-blue/10 text-pewter border-steel-blue/30',
  registered: 'bg-cyan/10 text-cyan border-cyan/30',
  storing: 'bg-amber/10 text-amber border-amber/30',
  a: 'bg-cyan/10 text-cyan border-cyan/30',
  b: 'bg-action-primary/10 text-action-primary border-action-primary/30',
  c: 'bg-pewter/10 text-pewter border-pewter/30',
  x: 'bg-success/10 text-success border-success/30',
  y: 'bg-amber/10 text-amber border-amber/30',
  z: 'bg-error/10 text-error border-error/30',
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase()
  const colorClass = statusColors[normalized] || 'bg-steel-blue/10 text-pewter border-steel-blue/30'
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center rounded-full border font-mono font-medium capitalize ${colorClass} ${sizeClass}`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ── METRIC CARD / STAT TILE ──────────────────────────────────────────────────
interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: string
  accent?: 'cyan' | 'electric' | 'amber' | 'red' | 'green'
}

const accentMap = {
  cyan: 'border-cyan/30 glow-cyan',
  electric: 'border-action-primary/30 glow-electric',
  amber: 'border-amber/30',
  red: 'border-error/30',
  green: 'border-success/30',
}

export function MetricCard({ label, value, icon, trend, accent = 'cyan' }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-xl p-5 border transition-all ${accentMap[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold font-mono text-text-primary">{value}</p>
          {trend && <p className="text-xs text-text-secondary mt-1">{trend}</p>}
        </div>
        {icon && <div className="p-2 rounded-lg bg-bg-elevated text-cyan">{icon}</div>}
      </div>
    </motion.div>
  )
}

// ── BUTTON ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  disabled?: boolean
  className?: string
  icon?: ReactNode
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
  icon,
}: ButtonProps) {
  const variants = {
    primary: 'bg-action-primary text-white border-action-primary hover:bg-action-primary/90',
    secondary: 'bg-cyan/10 text-cyan border-cyan/30 hover:bg-cyan/20',
    danger: 'bg-error/10 text-error border-error/30 hover:bg-error/20',
    ghost: 'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-elevated',
    outline: 'bg-bg-elevated text-text-primary border-border-primary hover:border-border-hover',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  )
}

// ── INPUT ────────────────────────────────────────────────────────────────────
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  value: string
  onChange: (value: string) => void
  icon?: ReactNode
}

export function Input({ label, type = 'text', value, onChange, placeholder, required, icon, className = '', ...rest }: InputProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          {...rest}
          className={`w-full rounded-lg border border-border-primary bg-bg-secondary py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary/50 transition-colors ${
            icon ? 'pl-9 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  )
}

// ── SELECT ───────────────────────────────────────────────────────────────────
interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  className?: string
}

export function Select({ label, value, onChange, options, className = '' }: SelectProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-text-secondary">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary/50 transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-elevated text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass-panel rounded-xl p-5 border border-border-primary ${className}`}>{children}</div>
}

// ── MODAL ────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg rounded-xl glass-panel border border-border-primary p-6 shadow-2xl z-10"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border-primary mb-4">
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── ENTERPRISE DATA TABLE ────────────────────────────────────────────────────
export interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no items to display.',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(data.length / pageSize) || 1
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="glass-panel rounded-xl border border-border-primary overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-border-primary bg-bg-elevated/50 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="p-4">
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary/50 font-sans">
            {paginatedData.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-bg-elevated/40 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="p-4">
                    {col.cell ? col.cell(row) : (row[col.accessorKey as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border-primary flex items-center justify-between text-xs text-text-secondary bg-bg-elevated/20">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="py-1 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <span className="font-mono text-text-primary">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="py-1 px-2 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LOADING SPINNER & SKELETON ───────────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-action-primary/30 border-t-action-primary" />
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-elevated rounded-md ${className}`} />
}

// ── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-xl border border-border-primary">
      <div className="mb-4 h-14 w-14 rounded-full bg-bg-elevated flex items-center justify-center border border-border-primary">
        <span className="text-xl text-text-secondary opacity-40 font-mono">Ø</span>
      </div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-xs text-text-secondary max-w-sm">{description}</p>}
    </div>
  )
}

export * from './gooey-text-morphing'
