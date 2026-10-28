import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation, Zap, Radio, Activity, Cpu } from 'lucide-react'
import logoSrc from '../../assets/logo.png'

const HERO_PHRASES = [
  'Fleet Orchestration.',
  'Spatial Intelligence.',
  'Full Autonomy.',
  'Real-Time Telemetry.',
]

export function HeroRoboticsAnimation() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_PHRASES.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl relative">
      {/* Central Interactive Robot Orbit Arena */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-6">
        {/* Outer Radar Ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-dashed border-cyan/30 pointer-events-none"
        />

        {/* Outer Radar Ring 2 with counter rotation */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border border-dotted border-action-primary/40 pointer-events-none"
        />

        {/* Radar Scanner Conic Sweep */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-full pointer-events-none opacity-40"
          style={{
            background: 'conic-gradient(from 0deg, rgba(6, 182, 212, 0.45) 0deg, transparent 60deg, transparent 360deg)',
          }}
        />

        {/* Orbiting AMR Node 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 neu-raised !rounded-full px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-cyan animate-ping" />
            <span className="text-[10px] font-mono font-bold text-cyan">AMR-01 [ACTIVE]</span>
          </div>
        </motion.div>

        {/* Orbiting AMR Node 2 */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-6 pointer-events-none"
        >
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 neu-raised !rounded-full px-2.5 py-1">
            <Navigation className="w-2.5 h-2.5 text-action-primary" />
            <span className="text-[10px] font-mono font-bold text-action-primary">AMR-02 [NAV]</span>
          </div>
        </motion.div>

        {/* Orbiting Telemetry Node 3 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-10 pointer-events-none"
        >
          <div className="absolute top-1/2 -right-4 -translate-y-1/2 flex items-center gap-1 neu-raised !rounded-full px-2 py-0.5">
            <Zap className="w-2.5 h-2.5 text-amber" />
            <span className="text-[9px] font-mono font-bold text-amber">98%</span>
          </div>
        </motion.div>

        {/* Center Glowing ARMS Core Logo */}
        <motion.div
          animate={{
            scale: [1, 1.04, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl neu-float flex items-center justify-center p-3"
        >
          {/* Inner pulsating glow */}
          <div className="absolute inset-0 rounded-3xl bg-cyan/5 motion-safe:animate-pulse pointer-events-none" />
          <img
            src={logoSrc}
            alt="ARMS Core Robot Mascot"
            className="w-full h-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.25)) transition-transform duration-300 hover:scale-110 cursor-pointer"
          />
        </motion.div>
      </div>

      {/* Kinetic Morphing Title Animation */}
      <div className="h-20 sm:h-24 flex items-center justify-center w-full px-4 overflow-hidden mb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 35, filter: 'blur(8px)', scale: 0.96 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, y: -35, filter: 'blur(8px)', scale: 0.96 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight font-display">
              <span className="text-hero-kinetic font-black">
                {HERO_PHRASES[index]}
              </span>
            </h1>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Real-time HUD Indicator */}
      <div className="flex items-center gap-4 px-4 py-1.5 rounded-full neu-inset !rounded-full text-[11px] font-mono text-text-secondary mb-6">
        <span className="flex items-center gap-1.5 text-cyan font-semibold">
          <Radio className="w-3 h-3 animate-pulse text-cyan" /> ROS 2 BRIDGE
        </span>
        <span className="w-1 h-1 rounded-full bg-border-hover" />
        <span className="flex items-center gap-1 text-action-primary">
          <Activity className="w-3 h-3 text-action-primary" /> LIVE TELEMETRY
        </span>
        <span className="w-1 h-1 rounded-full bg-border-hover" />
        <span className="flex items-center gap-1 text-success">
          <Cpu className="w-3 h-3 text-success" /> SLOTTING ENGINE
        </span>
      </div>
    </div>
  )
}
