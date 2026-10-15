import { onAuthStateChanged, signOut } from 'firebase/auth'
import { BookOpen, ClipboardList, FolderOpen, GitCompare, Home, LogIn, LogOut, Menu, Moon, Shield, ShieldCheck, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import LanguageSwitcher from './LanguageSwitcher'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return [dark, setDark] as const
}

export default function Layout() {
  const { t } = useTranslation()
  const [dark, setDark] = useDarkMode()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const navigate = useNavigate()

  const links = [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/catalog', label: t('nav.schemeCatalog'), icon: BookOpen },
    { to: '/check', label: t('nav.checkEligibility'), icon: Shield },
    { to: '/compare', label: t('nav.compareSchemes'), icon: GitCompare },
    { to: '/documents', label: t('nav.myDocuments'), icon: FolderOpen },
    { to: '/history', label: t('nav.myAssessments'), icon: ClipboardList },
  ]

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
    <div className="min-h-screen flex flex-col bg-gov-cream dark:bg-slate-900">
      {/* Tricolor strip */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white dark:bg-slate-200" />
        <div className="flex-1 bg-gov-green" />
      </div>

      {/* Main header */}
      <header className="bg-gov-navy text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <ShieldCheck size={28} className="text-gov-gold shrink-0" />
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-wide">Policy Maze</h1>
            <p className="text-gov-gold-light text-[11px] mt-0.5 tracking-wide">
              {t('header.subtitle')}
            </p>
          </div>
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setDark(!dark)}
              className="text-gov-gold-light hover:text-white transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {isLoggedIn ? (
              <>
                <span className="text-xs text-gov-gold-light">{userName}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-gov-gold-light hover:text-white transition-colors"
                >
                  <LogOut size={14} /> {t('common.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-xs bg-gov-gold/20 text-gov-gold px-3 py-1.5 rounded-lg hover:bg-gov-gold/30 transition-colors font-medium"
              >
                <LogIn size={14} /> {t('common.login')}
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
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">{t('footer.aboutTitle')}</h4>
              <p className="leading-relaxed">{t('footer.aboutText')}</p>
            </div>
            <div>
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">{t('footer.quickLinks')}</h4>
              <ul className="space-y-1">
                <li><a href="/catalog" className="hover:text-white transition-colors">{t('footer.browseSchemes')}</a></li>
                <li><a href="/check" className="hover:text-white transition-colors">{t('footer.checkEligibility')}</a></li>
                <li><a href="/documents" className="hover:text-white transition-colors">{t('footer.importDocuments')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">{t('footer.contactTitle')}</h4>
              <p className="leading-relaxed">{t('footer.contactText')}</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between items-center">
            <span className="text-[10px]">&copy; {t('footer.copyright')}</span>
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
