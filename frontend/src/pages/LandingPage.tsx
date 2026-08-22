import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeroRoboticsAnimation } from '../components/ui/HeroRoboticsAnimation'
import { Button } from '../components/ui'
import { useThemeStore } from '../stores/themeStore'
import { Cpu, ShieldCheck, Sparkles, ArrowRight, Layers, Sun, Moon } from 'lucide-react'
import logoSrc from '../assets/logo.png'

export function LandingPage() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background ambient neon orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-action-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-cyan/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-action-primary/10 border border-action-primary/40 flex items-center justify-center overflow-hidden p-1.5 shadow-lg shadow-action-primary/20 backdrop-blur-md">
            <img src={logoSrc} alt="ARMS Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wider text-gradient-arms font-display">ARMS</span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold tracking-widest uppercase bg-action-primary/10 text-action-secondary border border-action-primary/30 rounded-md">
              CORE OS
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-border-primary/60 transition-colors cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4 text-slate-800" /> : <Sun className="h-4 w-4 text-amber" />}
          </button>

          <Link to="/wms">
            <Button variant="ghost" className="text-sm font-semibold border border-action-primary/20 hover:border-action-primary/50">
              <Layers className="w-4 h-4 mr-1.5 text-cyan" />
              Spatial WMS
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="primary" className="text-sm font-semibold shadow-md shadow-action-primary/25">
              Console Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="flex flex-col items-center z-10 text-center max-w-4xl pt-16"
      >
        {/* Artistic System Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-cyber mb-4 text-xs font-mono text-cyan tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-action-secondary animate-pulse" />
          <span>AUTONOMOUS ROBOTIC MANAGEMENT SYSTEM</span>
        </div>

        {/* Dynamic Robotics & Kinetic Text Animation */}
        <HeroRoboticsAnimation />
        
        <p className="text-text-secondary text-base sm:text-lg text-center max-w-2xl mb-6 leading-relaxed">
          <strong className="text-text-primary font-semibold">ARMS</strong> is the next-generation autonomous robotics and warehouse orchestration platform, unifying ROS 2 fleets, dynamic spatial slotting, and intelligent warehouse memory.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 text-xs font-mono text-text-secondary">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface/80 border border-border-primary">
            <Cpu className="w-3.5 h-3.5 text-cyan" /> ROS 2 Integrated
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface/80 border border-border-primary">
            <ShieldCheck className="w-3.5 h-3.5 text-success" /> Real-time Telemetry
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface/80 border border-border-primary">
            <Layers className="w-3.5 h-3.5 text-amber" /> 3D Spatial Slotting
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link to="/login">
            <Button variant="primary" className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-lg shadow-action-primary/30 flex items-center justify-center gap-2">
              Launch ARMS Console <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/wms">
            <Button variant="ghost" className="w-full sm:w-auto px-8 py-3.5 text-base border border-border-primary hover:border-action-primary/40 bg-bg-card/40 backdrop-blur-md">
              Explore Spatial Engine →
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
