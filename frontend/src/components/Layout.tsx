import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BookOpen, ClipboardList, FolderOpen, GitCompare, Home, LogIn, LogOut, Menu, Shield, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/catalog', label: 'Scheme Catalog', icon: BookOpen },
  { to: '/check', label: 'Check Eligibility', icon: Shield },
  { to: '/compare', label: 'Compare Schemes', icon: GitCompare },
  { to: '/documents', label: 'My Documents', icon: FolderOpen },
  { to: '/history', label: 'My Assessments', icon: ClipboardList },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName || user.email?.split('@')[0] || 'User')
      } else {
        setUserName(null)
      }
    })
    return unsub
  }, [])

  const isLoggedIn = !!userName

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_email')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gov-cream">
      {/* Tricolor strip */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-gov-green" />
      </div>

      {/* Main header */}
      <header className="bg-gov-navy text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <ShieldCheck size={28} className="text-gov-gold shrink-0" />
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-wide">Policy Maze</h1>
            <p className="text-gov-gold-light text-[11px] mt-0.5 tracking-wide">
              Government Scheme Eligibility Portal
            </p>
          </div>
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="text-xs text-gov-gold-light">{userName}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-gov-gold-light hover:text-white transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-xs bg-gov-gold/20 text-gov-gold px-3 py-1.5 rounded-lg hover:bg-gov-gold/30 transition-colors font-medium"
              >
                <LogIn size={14} /> Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="bg-gov-navy-light border-b border-gov-gold/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`${mobileOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row`}>
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'text-gov-gold border-gov-gold bg-white/5'
                      : 'text-gray-300 border-transparent hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gov-navy text-gray-400 border-t-2 border-gov-gold">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div>
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">About Policy Maze</h4>
              <p className="leading-relaxed">
                An AI-powered platform that parses government policy documents, extracts eligibility rules,
                and provides traceable, explainable decisions for citizens.
              </p>
            </div>
            <div>
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">Quick Links</h4>
              <ul className="space-y-1">
                <li><a href="/catalog" className="hover:text-white transition-colors">Browse 2,100+ Schemes</a></li>
                <li><a href="/check" className="hover:text-white transition-colors">Check Your Eligibility</a></li>
                <li><a href="/documents" className="hover:text-white transition-colors">Import Your Documents</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">Contact Us</h4>
              <p className="leading-relaxed">
                For queries and support, contact the helpdesk at support@policymaze.gov.in
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between items-center">
            <span className="text-[10px]">&copy; 2026 Policy Maze &mdash; Government Scheme Eligibility Portal</span>
            <div className="flex gap-0.5 h-1">
              <div className="w-8 bg-gov-saffron rounded-sm" />
              <div className="w-8 bg-white rounded-sm" />
              <div className="w-8 bg-gov-green rounded-sm" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
