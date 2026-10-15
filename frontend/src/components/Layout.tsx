import { BookOpen, FolderOpen, GitCompare, Home, Menu, ScrollText, Shield, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/catalog', label: 'Scheme Catalog', icon: BookOpen },
  { to: '/check', label: 'Check Eligibility', icon: Shield },
  { to: '/compare', label: 'Compare Schemes', icon: GitCompare },
  { to: '/documents', label: 'My Documents', icon: FolderOpen },
  { to: '/rules', label: 'Extracted Rules', icon: ScrollText },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gov-gold/20 border-2 border-gov-gold flex items-center justify-center text-gov-gold font-bold text-lg shrink-0">
            PM
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-wide">Policy Maze</h1>
            <p className="text-gov-gold-light text-xs mt-0.5 tracking-wide">
              National Eligibility Decision Support System &mdash; AI-Powered Policy Interpretation
            </p>
          </div>
          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="hidden md:flex items-center gap-3 text-xs text-gov-gold-light">
            <span>Byteathon 2026</span>
            <span className="w-1 h-1 rounded-full bg-gov-gold" />
            <span>BYTE02</span>
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

      {/* Breadcrumb strip */}
      <div className="bg-gov-gold/10 border-b border-gov-border">
        <div className="max-w-7xl mx-auto px-4 py-2 text-xs text-gov-navy/60">
          Government Scheme Eligibility Portal &mdash; Powered by Neurosymbolic AI
        </div>
      </div>

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
              <h4 className="text-gov-gold font-semibold mb-2 uppercase tracking-wider text-[11px]">Technology</h4>
              <p className="leading-relaxed">
                Neurosymbolic architecture: LLM extracts rules, deterministic engine evaluates.
                Every decision is traceable to source document text.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between items-center">
            <span className="text-[10px]">Byteathon 2026 &middot; Problem Statement BYTE02</span>
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
