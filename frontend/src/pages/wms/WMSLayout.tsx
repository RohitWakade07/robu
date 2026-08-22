import { NavLink, Outlet, Link } from 'react-router-dom'
import { BarChart3, Box, ArrowLeft } from 'lucide-react'
import logoSrc from '../../assets/logo.png'
import { motion } from 'framer-motion'

export function WMSLayout() {
  return (
    <div className="min-h-screen grid-bg flex flex-col text-text-primary">
      {/* Top Header */}
      <header className="bg-bg-primary backdrop-blur-xl border-b border-border-primary px-6 py-3 flex justify-between items-center z-30 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-action-primary/10 border border-action-primary/40 flex items-center justify-center overflow-hidden p-1 shadow-sm shadow-action-primary/25">
            <img src={logoSrc} alt="ARMS" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-black text-text-primary flex items-center gap-1.5">
              <span className="text-gradient-arms font-black tracking-wider text-base">ARMS</span>
              <span className="text-action-secondary text-[10px] font-mono font-bold bg-action-primary/10 border border-action-primary/30 px-1.5 py-0.5 rounded">WMS</span>
            </h1>
            <p className="text-[0.65rem] text-text-secondary font-mono uppercase tracking-widest mt-0.5">
              Spatial Intelligence Engine v4.0
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex gap-2 items-center">
          <NavLink
            to="/wms"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-action-primary/10 text-action-primary border-action-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border-transparent'
              }`
            }
          >
            <Box size={16} />
            Slotting Engine
          </NavLink>

          <NavLink
            to="/wms/analytics"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-action-primary/10 text-action-primary border-action-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border-transparent'
              }`
            }
          >
            <BarChart3 size={16} />
            Analytics
          </NavLink>

          <div className="w-px h-6 bg-border-primary mx-2" />

          <Link
            to="/admin"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Admin
          </Link>
        </nav>
      </header>

      {/* Page content fills the rest */}
      <main className="flex-1 flex flex-col overflow-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
