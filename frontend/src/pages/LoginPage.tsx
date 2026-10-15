import { signInWithEmailAndPassword } from 'firebase/auth'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }

    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const token = await cred.user.getIdToken()
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_name', cred.user.displayName || email.split('@')[0])
      localStorage.setItem('user_email', email)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.'
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Invalid email or password.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gov-cream flex flex-col">
      <div className="flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck size={32} className="text-gov-navy" />
              <h1 className="text-2xl font-bold text-gov-navy">Policy Maze</h1>
            </div>
            <p className="text-sm text-gray-500">Government Scheme Eligibility Portal</p>
          </div>

          <div className="bg-white border border-gov-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gov-navy mb-5">Sign In</h2>

            {error && (
              <div className="bg-gov-maroon/5 border border-gov-maroon/20 text-gov-maroon text-sm rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gov-navy/70 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-gov-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-gov-blue focus:border-gov-blue bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gov-navy/70 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 border border-gov-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-gov-blue focus:border-gov-blue bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gov-navy text-white py-2.5 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-gov-blue font-medium hover:underline">Register</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
