import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GooeyText } from '../components/ui/gooey-text-morphing'
import { Button } from '../components/ui'
import logoSrc from '../assets/logo.png'

export function LandingPage() {
  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-action-primary/10 border border-action-primary/30 flex items-center justify-center overflow-hidden p-1">
          <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-xl font-bold text-text-primary">Robu</span>
      </div>
      
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <Link to="/wms">
          <Button variant="ghost" className="text-sm font-semibold">
            WMS Engine
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="ghost">Login</Button>
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center z-10"
      >
        <div className="h-[200px] flex items-center justify-center mb-8 w-[80vw] max-w-4xl">
          <GooeyText
            texts={["Navigation.", "Intelligence.", "Automation."]}
            morphTime={1.5}
            cooldownTime={1}
            className="font-bold tracking-tight"
          />
        </div>
        
        <p className="text-text-secondary text-lg text-center max-w-xl mb-10">
          The autonomous robotics platform built for modern warehousing, inventory management, and operational scale.
        </p>

        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="primary" className="px-8 py-3 text-base">
              Get Started
            </Button>
          </Link>
          <Link to="/wms">
            <Button variant="ghost" className="px-8 py-3 text-base">
              Try WMS Demo →
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
