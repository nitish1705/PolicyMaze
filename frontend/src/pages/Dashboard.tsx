import { ArrowRight, BookOpen, FolderOpen, GitCompare, Landmark, MapPin, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSchemes } from '../api/client'
import type { SchemeListItem } from '../types'

interface CatalogStats {
  total: number
  central: number
  state: number
}

export default function Dashboard() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null)

  useEffect(() => {
    getSchemes().then((r) => setSchemes(r.schemes)).catch(() => {})
    const base = import.meta.env.VITE_API_URL || '/api'
    fetch(`${base}/catalog?per_page=1`)
      .then((r) => r.json())
      .then((data) => setCatalogStats({ total: data.total, central: 0, state: 0 }))
      .catch(() => {})
    fetch(`${base}/catalog?per_page=1&level=Central`)
      .then((r) => r.json())
      .then((data) => setCatalogStats((prev) => prev ? { ...prev, central: data.total } : null))
      .catch(() => {})
    fetch(`${base}/catalog?per_page=1&level=State`)
      .then((r) => r.json())
      .then((data) => setCatalogStats((prev) => prev ? { ...prev, state: data.total } : null))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-gov-navy to-gov-navy-light rounded-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gov-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-gov-gold text-xs font-semibold tracking-wider uppercase mb-3">
            <Shield size={14} />
            National Eligibility Decision Support
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            Know Your Entitlements.<br />
            <span className="text-gov-gold">Every Decision Explained.</span>
          </h1>
          <p className="text-gray-300 mt-3 max-w-xl text-sm leading-relaxed">
            Browse {catalogStats ? catalogStats.total.toLocaleString() : '2,000+'} government schemes,
            verify eligibility with AI-powered rule extraction, and receive fully traceable decisions
            citing exact policy document text.
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              to="/catalog"
              className="bg-gov-gold text-gov-navy px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gov-gold/90 transition-colors"
            >
              Browse Schemes
            </Link>
            <Link
              to="/check"
              className="border border-gov-gold/40 text-gov-gold px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Check Eligibility
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {catalogStats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Schemes', value: catalogStats.total.toLocaleString(), icon: BookOpen, accent: 'border-gov-saffron bg-gov-saffron/5' },
            { label: 'Central Schemes', value: catalogStats.central.toLocaleString(), icon: Landmark, accent: 'border-gov-green bg-gov-green/5' },
            { label: 'State Schemes', value: catalogStats.state.toLocaleString(), icon: MapPin, accent: 'border-gov-blue bg-gov-blue/5' },
          ].map((s) => (
            <div key={s.label} className={`border-l-4 ${s.accent} bg-white rounded-r-lg p-4 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gov-navy">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
                <s.icon size={24} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Services grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gov-gold rounded-full" />
          <h2 className="text-lg font-bold text-gov-navy">Citizen Services</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceCard icon={BookOpen} title="Scheme Catalog" desc="Browse 2,100+ central & state government schemes" to="/catalog" />
          <ServiceCard icon={Shield} title="Eligibility Check" desc="Verify your eligibility with traceable AI decisions" to="/check" />
          <ServiceCard icon={GitCompare} title="Compare Schemes" desc="Multi-scheme check and policy conflict analysis" to="/compare" />
          <ServiceCard icon={FolderOpen} title="My Documents" desc="Import personal documents for auto-filled eligibility checks" to="/documents" />
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gov-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-gov-green rounded-full" />
          <h2 className="text-lg font-bold text-gov-navy">How It Works</h2>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Select a Scheme', desc: 'Browse 2,100+ schemes from the catalog with pre-extracted rules' },
            { step: '02', title: 'Import Documents', desc: 'Upload Aadhaar, income cert, etc. — AI extracts your details' },
            { step: '03', title: 'Auto-Check', desc: 'System maps your documents to scheme requirements automatically' },
            { step: '04', title: 'Traced Verdict', desc: 'Each rule is evaluated against your profile with source citations' },
          ].map((s, i) => (
            <div key={s.step} className="relative">
              {i < 3 && <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-0.5 bg-gov-gold/20" />}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gov-navy text-gov-gold flex items-center justify-center mx-auto mb-3 text-sm font-bold border-2 border-gov-gold/30">
                  {s.step}
                </div>
                <div className="font-semibold text-gov-navy text-sm">{s.title}</div>
                <div className="text-gray-500 text-xs mt-1 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available schemes table */}
      {schemes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gov-saffron rounded-full" />
              <h2 className="text-lg font-bold text-gov-navy">Schemes Ready for Eligibility Check</h2>
            </div>
            <Link to="/catalog" className="text-gov-blue text-sm font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gov-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gov-navy/5 border-b border-gov-border">
                  <th className="text-left px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Scheme Name</th>
                  <th className="text-center px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Rules</th>
                  <th className="text-center px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Confidence</th>
                  <th className="text-right px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {schemes.slice(0, 10).map((s) => (
                  <tr key={s.document_id} className="border-b border-gray-100 hover:bg-gov-gold/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-gov-navy">{s.scheme_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-gov-blue/10 text-gov-blue px-2 py-0.5 rounded text-xs font-medium">{s.rule_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.extraction_confidence ? (
                        <span className={`text-xs font-medium ${s.extraction_confidence >= 0.9 ? 'text-gov-green' : 'text-gov-saffron'}`}>
                          {(s.extraction_confidence * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/check?doc=${s.document_id}`}
                        className="inline-flex items-center gap-1 text-gov-blue hover:text-gov-navy text-xs font-medium"
                      >
                        Check Eligibility <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceCard({
  icon: Icon,
  title,
  desc,
  to,
}: {
  icon: typeof BookOpen
  title: string
  desc: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="bg-white border border-gov-border rounded-xl p-5 hover:shadow-md hover:border-gov-gold/50 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-gov-navy/5 flex items-center justify-center group-hover:bg-gov-gold/10 transition-colors">
        <Icon size={20} className="text-gov-navy" />
      </div>
      <h3 className="font-semibold text-gov-navy mt-3 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
      <div className="flex items-center gap-1 text-gov-gold text-xs font-medium mt-3 group-hover:gap-2 transition-all">
        Access Service <ArrowRight size={12} />
      </div>
    </Link>
  )
}
