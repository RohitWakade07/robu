import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  Inbox,
  Loader2,
} from 'lucide-react'
import { create } from 'zustand'

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const NEUTRAL = 'text-text-secondary'
const statusColors: Record<string, string> = {
  idle: NEUTRAL,
  busy: 'text-action-primary',
  offline: 'text-text-muted',
  error: 'text-error',
  charging: 'text-cyan',
  working: 'text-action-primary',
  maintenance: 'text-amber',
  pending: 'text-amber',
  confirmed: 'text-cyan',
  processing: 'text-amber',
  retrieving: 'text-action-primary',
  completed: 'text-success',
  failed: 'text-error',
  queued: NEUTRAL,
  registered: 'text-cyan',
  storing: 'text-amber',
  active: 'text-success',
  administrator: 'text-purple',
  warehouse_operator: 'text-cyan',
  customer: NEUTRAL,
  a: 'text-cyan',
  b: 'text-action-primary',
  c: NEUTRAL,
  x: 'text-success',
  y: 'text-amber',
  z: 'text-error',
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const label = status || 'unknown'
  const normalized = label.toLowerCase()
  const colorClass = statusColors[normalized] || NEUTRAL
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center rounded-full bg-bg-secondary font-medium capitalize shadow-[var(--neu-inset)] ${colorClass} ${sizeClass}`}
    >
      <span aria-hidden="true" className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {label.replace(/_/g, ' ')}
    </span>
  )
}

// ── PAGE HEADER ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="t-page-title">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
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

const accentText = {
  cyan: 'text-cyan',
  electric: 'text-action-primary',
  amber: 'text-amber',
  red: 'text-error',
  green: 'text-success',
}

export function MetricCard({ label, value, icon, trend, accent = 'cyan' }: MetricCardProps) {
  return (
    <div className="neu-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-label uppercase">{label}</p>
          <p className="t-numeric mt-1.5 truncate text-2xl text-text-primary">{value}</p>
          {trend && <p className="mt-1 text-xs text-text-secondary">{trend}</p>}
        </div>
        {icon && (
          <div className={`neu-inset flex h-11 w-11 shrink-0 items-center justify-center ${accentText[accent]}`} aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// ── BUTTON ───────────────────────────────────────────────────────────────────
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children?: ReactNode
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  loading?: boolean
  icon?: ReactNode
}

const buttonVariants = {
  primary: 'bg-action-primary text-[var(--c-accent-ink)] shadow-[var(--neu-flat)] hover:shadow-[var(--neu-hover)] active:shadow-[var(--neu-pressed)]',
  secondary: 'neu-pressable text-action-primary',
  danger: 'neu-pressable text-error',
  outline: 'neu-pressable text-text-primary',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:shadow-[var(--neu-flat)] active:shadow-[var(--neu-pressed)]',
}

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  icon,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-neu-sm)] px-4 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:text-[var(--c-disabled)] disabled:shadow-none ${buttonVariants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`neu-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-neu-sm)] text-text-secondary hover:text-text-primary cursor-pointer disabled:cursor-not-allowed disabled:text-[var(--c-disabled)] ${className}`}
    >
      {children}
    </button>
  )
}

// ── FORM FIELDS ──────────────────────────────────────────────────────────────
const fieldBase =
  'w-full rounded-[var(--radius-neu-sm)] bg-bg-secondary text-sm text-text-primary shadow-[var(--neu-inset)] placeholder:text-text-muted border border-transparent transition-shadow focus-visible:outline-none focus-visible:border-action-primary disabled:text-[var(--c-disabled)] disabled:cursor-not-allowed'

function FieldShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label?: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {label && (
        <label htmlFor={id} className="t-label block">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-xs text-text-secondary">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  value: string
  onChange: (value: string) => void
  icon?: ReactNode
  hint?: string
  error?: string
}

export function Input({ label, type = 'text', value, onChange, icon, hint, error, className = '', id, ...rest }: InputProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          {...rest}
          className={`${fieldBase} min-h-10 py-2 ${icon ? 'pl-9 pr-3' : 'px-3.5'} ${error ? 'border-error' : ''}`}
        />
      </div>
    </FieldShell>
  )
}

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
}

export function Textarea({ label, value, onChange, hint, error, className = '', id, rows = 3, ...rest }: TextareaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={fieldId}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        {...rest}
        className={`${fieldBase} resize-y px-3.5 py-2.5 ${error ? 'border-error' : ''}`}
      />
    </FieldShell>
  )
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  className?: string
  id?: string
  disabled?: boolean
  'aria-label'?: string
}

export function Select({ label, value, onChange, options, className = '', id, disabled, ...rest }: SelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldShell id={fieldId} label={label} className={className}>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          disabled={disabled}
          aria-label={rest['aria-label']}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldBase} min-h-10 appearance-none cursor-pointer py-2 pl-3.5 pr-9`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
      </div>
    </FieldShell>
  )
}

// ── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`neu-raised p-5 ${className}`}>{children}</div>
}

// ── TABS ─────────────────────────────────────────────────────────────────────
export function Tabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[next].value)
    ;(e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="neu-inset inline-flex gap-1 p-1">
      {tabs.map((tab, idx) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={`min-h-9 rounded-[calc(var(--radius-neu-sm)-2px)] px-4 text-sm font-semibold transition-all cursor-pointer ${
              selected ? 'bg-bg-primary text-action-primary shadow-[var(--neu-flat)]' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// ── NOTICE / ERROR STATES ────────────────────────────────────────────────────
const noticeTone = {
  info: { icon: Info, text: 'text-action-primary' },
  warning: { icon: AlertTriangle, text: 'text-amber' },
  error: { icon: AlertTriangle, text: 'text-error' },
  success: { icon: CheckCircle2, text: 'text-success' },
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: keyof typeof noticeTone
  title?: string
  children?: ReactNode
}) {
  const { icon: Icon, text } = noticeTone[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="neu-inset flex items-start gap-3 p-4">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} aria-hidden="true" />
      <div className="min-w-0 text-sm">
        {title && <p className={`font-semibold ${text}`}>{title}</p>}
        {children && <div className="text-text-secondary">{children}</div>}
      </div>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', error, onRetry }: { title?: string; error?: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'The request could not be completed.'
  return (
    <div role="alert" className="neu-raised flex flex-col items-center p-10 text-center">
      <div className="neu-inset mb-4 flex h-14 w-14 items-center justify-center text-error" aria-hidden="true">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="t-section-title">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

// ── MODAL ────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // Focus the first form field (not the close button) when present.
    const first = panel?.querySelector<HTMLElement>('input,select,textarea') ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previous?.focus()
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--c-base)_70%,transparent)] backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.97 }}
            transition={{ duration: 0.18 }}
            className="neu-float relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-b-none p-5 sm:rounded-b-[var(--radius-neu-lg)] sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id={titleId} className="t-section-title">
                {title}
              </h2>
              <IconButton label="Close dialog" onClick={onClose} className="h-9 w-9">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="overflow-y-auto px-1 pb-1 pt-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── CONFIRM DIALOG (replaces window.confirm) ─────────────────────────────────
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p className="text-sm text-text-secondary">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ── TOASTS ───────────────────────────────────────────────────────────────────
interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  message: string
}
interface ToastStore {
  toasts: Toast[]
  push: (tone: Toast['tone'], message: string) => void
  dismiss: (id: number) => void
}
let toastSeq = 0
export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (tone, message) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, tone, message }] }))
    setTimeout(() => get().dismiss(id), 5000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
}

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-3" aria-live="polite">
      {toasts.map((t) => {
        const tone = t.tone === 'success' ? noticeTone.success : t.tone === 'error' ? noticeTone.error : noticeTone.info
        const Icon = tone.icon
        return (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="neu-float pointer-events-auto flex items-start gap-3 p-4">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} aria-hidden="true" />
            <p className="flex-1 text-sm text-text-primary">{t.message}</p>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="text-text-secondary hover:text-text-primary cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── DROPDOWN MENU ────────────────────────────────────────────────────────────
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className={`neu-float absolute z-50 mt-2 w-64 p-2 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

// ── DATA TABLE ───────────────────────────────────────────────────────────────
export interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => ReactNode
  sortable?: boolean
  /** Value used for sorting when the column renders via `cell`. */
  sortValue?: (row: T) => string | number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  caption?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no items to display.',
  caption,
}: DataTableProps<T>) {
  const [requestedPage, setPage] = useState(1)
  const [sort, setSort] = useState<{ index: number; dir: 'asc' | 'desc' } | null>(null)

  const sorted = useMemo(() => {
    const rows = Array.isArray(data) ? data : []
    if (!sort) return rows
    const col = columns[sort.index]
    const read = (row: T): string | number => {
      if (col.sortValue) return col.sortValue(row)
      const v = col.accessorKey ? row[col.accessorKey] : ''
      return typeof v === 'number' ? v : String(v ?? '')
    }
    return [...rows].sort((a, b) => {
      const av = read(a)
      const bv = read(b)
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(requestedPage, totalPages) // data may shrink under us
  const start = (currentPage - 1) * pageSize
  const paginated = sorted.slice(start, start + pageSize)

  if (sorted.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const toggleSort = (index: number) => {
    setPage(1)
    setSort((prev) => (prev?.index === index ? (prev.dir === 'asc' ? { index, dir: 'desc' } : null) : { index, dir: 'asc' }))
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-neu)] shadow-[var(--neu-inset)] bg-bg-secondary">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <tr>
              {columns.map((col, idx) => {
                const active = sort?.index === idx
                const sortable = col.sortable && (col.accessorKey || col.sortValue)
                return (
                  <th
                    key={idx}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                    className="whitespace-nowrap px-4 py-3.5"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(idx)}
                        className="inline-flex items-center gap-1 rounded uppercase tracking-wider hover:text-text-primary cursor-pointer"
                      >
                        {col.header}
                        {active ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-60" />}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, rowIdx) => (
              <tr key={start + rowIdx} className="border-t border-border-primary transition-colors hover:bg-bg-primary/60">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3.5 align-middle">
                    {col.cell ? col.cell(row) : (row[col.accessorKey as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav aria-label="Table pagination" className="flex flex-col items-center justify-between gap-3 border-t border-border-primary p-3 text-xs text-text-secondary sm:flex-row">
          <span>
            Showing {start + 1}–{Math.min(start + pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-9 px-3 py-1 text-xs" aria-label="Previous page">
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <span className="t-numeric text-text-primary" aria-current="page">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="min-h-9 px-3 py-1 text-xs" aria-label="Next page">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}

// ── LOADING SPINNER & SKELETON ───────────────────────────────────────────────
export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center p-12">
      <div className="neu-raised flex h-16 w-16 items-center justify-center rounded-full">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-action-primary/25 border-t-action-primary" />
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[var(--radius-neu-sm)] bg-bg-secondary shadow-[var(--neu-inset)] ${className}`} />
}

// ── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="neu-inset flex flex-col items-center justify-center p-10 text-center">
      <div className="neu-inset mb-4 flex h-14 w-14 items-center justify-center text-text-secondary" aria-hidden="true">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="t-section-title">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
