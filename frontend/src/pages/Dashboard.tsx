import { BookOpen, FileText, Shield, ScrollText, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSchemes } from '../api/client'
import type { SchemeListItem } from '../types'

interface CatalogStats {
  total: number
  with_rules: number
}

export default function Dashboard() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null)

  useEffect(() => {
    getSchemes().then((r) => setSchemes(r.schemes)).catch(() => {})
    fetch('/api/catalog?per_page=1')
      .then((r) => r.json())
      .then((data) => setCatalogStats({ total: data.total, with_rules: 0 }))
      .catch(() => {})
    fetch('/api/catalog?per_page=1&has_rules=true')
      .then((r) => r.json())
      .then((data) => setCatalogStats((prev) => prev ? { ...prev, with_rules: data.total } : null))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Policy Maze</h1>
        <p className="text-gray-500 mt-2">
          AI-powered policy interpretation with traceable eligibility decisions.
          Browse {catalogStats ? catalogStats.total.toLocaleString() : '2,000+'} government schemes, extract rules automatically, and check eligibility with full reasoning traces.
        </p>
      </div>

      {catalogStats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-indigo-700">{catalogStats.total.toLocaleString()}</div>
            <div className="text-sm text-indigo-600 mt-1">Schemes in Catalog</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-green-700">{catalogStats.with_rules}</div>
            <div className="text-sm text-green-600 mt-1">With Pre-extracted Rules</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-purple-700">{schemes.length}</div>
            <div className="text-sm text-purple-600 mt-1">Ready for Eligibility Check</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <ActionCard
          icon={BookOpen}
          title="Browse Catalog"
          desc="2,000+ schemes from myScheme.gov.in"
          to="/catalog"
          color="amber"
        />
        <ActionCard
          icon={Shield}
          title="Check Eligibility"
          desc="Evaluate against extracted rules"
          to="/check"
          color="green"
        />
        <ActionCard
          icon={FileText}
          title="Upload Policy"
          desc="Parse a PDF with AI extraction"
          to="/upload"
          color="indigo"
        />
        <ActionCard
          icon={ScrollText}
          title="View Rules"
          desc="Browse rules with source citations"
          to="/rules"
          color="purple"
        />
      </div>

      {schemes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Schemes with Rules</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
            {schemes.map((s) => (
              <div key={s.document_id} className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{s.scheme_name}</div>
                  <div className="text-xs text-gray-500">
                    {s.rule_count} rules &middot;{' '}
                    {s.extraction_confidence ? `${(s.extraction_confidence * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
                <Link
                  to={`/check?doc=${s.document_id}`}
                  className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1"
                >
                  Check <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-100 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How It Works</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            { step: '1', title: 'Browse or Upload', desc: 'Pick from 2000+ schemes or upload a PDF' },
            { step: '2', title: 'AI Extracts Rules', desc: 'Regex + LLM extract structured rules' },
            { step: '3', title: 'Fill Profile', desc: 'Enter your information in a dynamic form' },
            { step: '4', title: 'Get Verdict', desc: 'Deterministic engine evaluates with full trace' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                {s.step}
              </div>
              <div className="font-medium text-gray-900">{s.title}</div>
              <div className="text-gray-500 text-xs mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActionCard({
  icon: Icon,
  title,
  desc,
  to,
  color,
}: {
  icon: typeof FileText
  title: string
  desc: string
  to: string
  color: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
    green: 'bg-green-50 border-green-200 hover:border-green-400',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    amber: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  }
  const iconColors: Record<string, string> = {
    indigo: 'text-indigo-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
  }

  return (
    <Link
      to={to}
      className={`border rounded-xl p-5 transition-colors ${colors[color]}`}
    >
      <Icon size={28} className={iconColors[color]} />
      <h3 className="font-semibold text-gray-900 mt-3">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </Link>
  )
}
