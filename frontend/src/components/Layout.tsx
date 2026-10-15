import { BookOpen, FileText, GitCompare, Home, ScrollText, Shield } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/catalog', label: 'Scheme Catalog', icon: BookOpen },
  { to: '/check', label: 'Check Eligibility', icon: Shield },
  { to: '/compare', label: 'Compare & Diff', icon: GitCompare },
  { to: '/upload', label: 'Upload Policy', icon: FileText },
  { to: '/rules', label: 'Extracted Rules', icon: ScrollText },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-tight">Policy Maze</h1>
          <p className="text-xs text-gray-400 mt-1">Explainable Eligibility Engine</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          Byteathon 2026 &middot; BYTE02
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
