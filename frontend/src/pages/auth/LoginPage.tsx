import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Button, Input } from '../../components/ui'
import logoSrc from '../../assets/logo.png'

const demoAccounts = [
  { email: 'customer@robu.io', password: 'customer123', role: 'Customer' },
  { email: 'operator@robu.io', password: 'operator123', role: 'Operator' },
  { email: 'admin@robu.io', password: 'admin12345', role: 'Admin' },
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
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-action-primary/5 via-transparent to-cyan/5" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-action-primary/10 border border-action-primary/30 glow-electric mb-4 overflow-hidden p-1">
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Robu Platform</h1>
          <p className="text-sm text-text-secondary mt-1">Autonomous Inventory Management</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
          <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </Button>

          <div className="pt-4 border-t border-border-primary">
            <p className="text-xs text-text-secondary mb-3 text-center">Demo Accounts</p>
            <div className="flex gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-xs text-text-secondary hover:text-action-primary hover:border-action-primary/30 transition-colors"
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
