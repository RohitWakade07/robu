import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Button, Input } from '../../components/ui'
import logoSrc from '../../assets/logo.png'

const demoAccounts = [
  { email: 'admin@arms.io', password: 'admin12345', role: 'Admin' },
  { email: 'operator@arms.io', password: 'operator123', role: 'Operator' },
  { email: 'customer@arms.io', password: 'customer123', role: 'Customer' },
]

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const fillDemo = (account: typeof demoAccounts[0]) => {
    setEmail(account.email)
    setPassword(account.password)
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-action-primary/10 via-transparent to-cyan/10 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-action-primary/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Top back button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-mono text-text-secondary hover:text-cyan transition-colors z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Return to ARMS Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-midnight-light to-elevated border border-action-primary/40 glow-arms mb-3 overflow-hidden p-2 shadow-2xl">
            <img src={logoSrc} alt="ARMS Logo" className="w-full h-full object-contain filter drop-shadow(0 0 6px rgba(6,182,212,0.5))" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gradient-glow font-display">
            ARMS Console
          </h1>
          <p className="text-xs font-mono text-cyan uppercase tracking-widest mt-1">
            Autonomous Robotic Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-7 space-y-5 border border-border-primary/80 shadow-2xl backdrop-blur-xl bg-bg-card/80">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Input label="Fleet Email Address" type="email" value={email} onChange={setEmail} placeholder="operator@arms.io" required />
          <Input label="Access Key / Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />

          <Button type="submit" disabled={isLoading} className="w-full py-3 text-sm font-semibold shadow-md shadow-action-primary/25">
            {isLoading ? 'Authenticating...' : 'Authenticate & Enter ARMS'}
          </Button>

          <div className="pt-4 border-t border-border-primary/60">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan" /> Quick Demo Credentials
              </span>
              <span className="text-[10px] font-mono text-action-secondary">One-click fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-lg border border-border-primary bg-bg-secondary/70 px-2.5 py-2 text-xs font-mono font-medium text-text-secondary hover:text-cyan hover:border-cyan/40 hover:bg-action-primary/5 transition-all cursor-pointer text-center"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
