import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GlobalSidebar } from '../components/navigation/GlobalSidebar'
import { TopHeader } from '../components/navigation/TopHeader'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex overflow-hidden">
      {/* Primary Global Navigation Sidebar */}
      <GlobalSidebar collapsed={sidebarCollapsed} />

      {/* Main Content Workspace Shell */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Navigation */}
        <TopHeader onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-bg-primary/50">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
