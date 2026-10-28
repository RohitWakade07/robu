import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeroRoboticsAnimation } from '../components/ui/HeroRoboticsAnimation'
import { IconButton } from '../components/ui'
import { useThemeStore } from '../stores/themeStore'
import { Cpu, ShieldCheck, ArrowRight, Layers, Sun, Moon } from 'lucide-react'
import logoSrc from '../assets/logo.png'

const features = [
  { icon: Cpu, label: 'ROS 2 integrated' },
  { icon: ShieldCheck, label: 'Real-time telemetry' },
  { icon: Layers, label: '3D spatial slotting' },
]

export function LandingPage() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-bg-primary px-4 pb-12 pt-28">
      <header className="absolute inset-x-4 top-4 z-20 flex items-center justify-between sm:inset-x-8 sm:top-6">
        <div className="flex items-center gap-3">
          <div className="neu-raised flex h-11 w-11 items-center justify-center p-1.5">
            <img src={logoSrc} alt="" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-extrabold tracking-wider text-text-primary">ARMS</span>
        </div>

        <div className="flex items-center gap-3">
          <IconButton label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </IconButton>
          <Link
            to="/login"
            className="inline-flex min-h-10 items-center rounded-[var(--radius-neu-sm)] bg-action-primary px-5 text-sm font-semibold text-[var(--c-accent-ink)] shadow-[var(--neu-flat)] hover:shadow-[var(--neu-hover)]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 flex max-w-4xl flex-col items-center text-center"
      >
        <p className="neu-inset mb-6 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-action-primary">
          Autonomous Robotic Management System
        </p>

        <HeroRoboticsAnimation />

        <p className="mb-8 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          <strong className="font-semibold text-text-primary">ARMS</strong> unifies ROS 2 robot fleets, dynamic spatial slotting, and warehouse inventory in one orchestration platform.
        </p>

        <ul className="mb-10 flex flex-wrap justify-center gap-4">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="neu-raised flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary">
              <Icon className="h-4 w-4 text-action-primary" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        <Link
          to="/login"
          className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-neu)] bg-action-primary px-8 text-base font-semibold text-[var(--c-accent-ink)] shadow-[var(--neu-raised)] transition-shadow hover:shadow-[var(--neu-hover)] active:shadow-[var(--neu-pressed)]"
        >
          Launch ARMS Console <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </motion.main>
    </div>
  )
}
