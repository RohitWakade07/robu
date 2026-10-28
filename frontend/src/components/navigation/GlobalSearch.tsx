import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { Modal, IconButton } from '../ui'
import { navSections } from './GlobalSidebar'
import { useAuthStore } from '../../stores/authStore'

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role) || 'customer'

  // Search is built from the same role-filtered navigation the sidebar shows.
  const pages = useMemo(
    () =>
      navSections
        .filter((s) => !s.roles || s.roles.includes(role))
        .flatMap((s) =>
          s.items
            .filter((i) => !i.roles || i.roles.includes(role))
            .map((i) => ({ ...i, section: s.label })),
        ),
    [role],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = pages.filter((p) => !q || p.label.toLowerCase().includes(q) || p.section.toLowerCase().includes(q))

  const close = () => {
    setIsOpen(false)
    setQuery('')
  }

  const handleSelect = (route: string) => {
    close()
    navigate(route)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search pages (Ctrl+K)"
        className="neu-inset hidden min-h-10 w-60 cursor-pointer items-center gap-3 px-3 text-xs text-text-secondary hover:text-text-primary md:flex"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="flex-1 text-left">Search pages…</span>
        <kbd className="rounded px-1.5 py-0.5 font-mono text-[10px] shadow-[var(--neu-flat)]">Ctrl K</kbd>
      </button>
      <IconButton label="Search pages" className="md:hidden" onClick={() => setIsOpen(true)}>
        <Search className="h-4 w-4" />
      </IconButton>

      <Modal isOpen={isOpen} onClose={close} title="Go to page">
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search pages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered[0]) handleSelect(filtered[0].route)
              }}
              placeholder="Type a page or section name…"
              className="min-h-10 w-full rounded-[var(--radius-neu-sm)] border border-transparent bg-bg-secondary py-2 pl-9 pr-4 text-sm text-text-primary shadow-[var(--neu-inset)] placeholder:text-text-muted focus-visible:border-action-primary focus-visible:outline-none"
            />
          </div>

          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <li className="py-6 text-center text-sm text-text-secondary">No matching pages.</li>
            ) : (
              filtered.map((item) => (
                <li key={item.route}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.route)}
                    className="group flex min-h-12 w-full cursor-pointer items-center justify-between rounded-[var(--radius-neu-sm)] p-2.5 text-left hover:shadow-[var(--neu-flat)]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="neu-inset flex h-9 w-9 items-center justify-center text-action-primary" aria-hidden="true">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-text-primary">{item.label}</span>
                        <span className="block text-xs text-text-secondary">{item.section}</span>
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>
    </>
  )
}
