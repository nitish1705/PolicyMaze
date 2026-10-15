import { AlertCircle, ArrowRight, CheckCircle, GitCompare, HelpCircle, Loader2, Shield, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSchemes } from '../api/client'
import type { SchemeListItem } from '../types'

interface MultiResult {
  session_id: string
  document_id: string
  scheme_name: string
  overall_verdict: string
  summary: string
  matched_count: number
  failed_count: number
  unknown_count: number
  total_rules: number
}

interface MultiResponse {
  results: MultiResult[]
  summary: {
    total_schemes: number
    eligible: number
    not_eligible: number
    partial: number
    insufficient_data: number
  }
}

interface DiffResult {
  field: string
  field_label: string
  change_type: string
  details: string
  old?: { operator: string; value: unknown }
  new?: { operator: string; value: unknown }
}

interface ConflictResult {
  conflict_id: string
  field: string
  conflict_type: string
  severity: string
  description: string
  recommendation: string
}

interface DiffResponse {
  document_a: { id: string; name: string; rule_count: number }
  document_b: { id: string; name: string; rule_count: number }
  diffs: DiffResult[]
  diff_summary: { added: number; removed: number; modified: number }
  conflicts: ConflictResult[]
  conflict_summary: { total: number; high: number; medium: number; low: number }
}

export default function ComparePage() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [mode, setMode] = useState<'multi' | 'diff'>('multi')

  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [profile, setProfile] = useState<Record<string, string>>({
    age: '', annual_income: '', gender: '', category: '', occupation: '',
    is_farmer: '', is_student: '', nationality: '',
  })
  const [multiResult, setMultiResult] = useState<MultiResponse | null>(null)
  const [multiLoading, setMultiLoading] = useState(false)

  const [docA, setDocA] = useState('')
  const [docB, setDocB] = useState('')
  const [diffResult, setDiffResult] = useState<DiffResponse | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    getSchemes().then((r) => setSchemes(r.schemes)).catch(() => {})
  }, [])

  const toggleScheme = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    )
  }

  const runMultiCheck = async () => {
    if (selectedDocs.length === 0) return
    setMultiLoading(true)
    setMultiResult(null)
    try {
      const profileData: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(profile)) {
        if (!v) continue
        if (v === 'true') profileData[k] = true
        else if (v === 'false') profileData[k] = false
        else if (!isNaN(Number(v))) profileData[k] = Number(v)
        else profileData[k] = v
      }
      const res = await fetch('/api/eligibility/multi-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: selectedDocs, profile: profileData }),
      })
      setMultiResult(await res.json())
    } catch { /* ignore */ }
    finally { setMultiLoading(false) }
  }

  const runDiff = async () => {
    if (!docA || !docB) return
    setDiffLoading(true)
    setDiffResult(null)
    try {
      const res = await fetch('/api/documents/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id_a: docA, document_id_b: docB }),
      })
      setDiffResult(await res.json())
    } catch { /* ignore */ }
    finally { setDiffLoading(false) }
  }

  const VerdictIcon = ({ verdict }: { verdict: string }) => {
    if (verdict === 'ELIGIBLE') return <CheckCircle size={20} className="text-gov-green" />
    if (verdict === 'NOT_ELIGIBLE') return <XCircle size={20} className="text-gov-maroon" />
    if (verdict === 'PARTIAL') return <AlertCircle size={20} className="text-gov-saffron" />
    return <HelpCircle size={20} className="text-gov-blue" />
  }

  const verdictColor = (v: string) => {
    if (v === 'ELIGIBLE') return 'bg-gov-green/5 border-gov-green/30 text-gov-green'
    if (v === 'NOT_ELIGIBLE') return 'bg-gov-maroon/5 border-gov-maroon/30 text-gov-maroon'
    if (v === 'PARTIAL') return 'bg-gov-saffron/5 border-gov-saffron/30 text-gov-saffron'
    return 'bg-gov-blue/5 border-gov-blue/30 text-gov-blue'
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-gold rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy">Compare & Analyze</h1>
        </div>
        <p className="text-gray-500 text-sm ml-3">Multi-scheme eligibility check or compare two policy documents</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('multi')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'multi' ? 'bg-gov-navy text-white' : 'bg-gov-navy/5 text-gov-navy hover:bg-gov-navy/10'}`}
        >
          <Shield size={14} className="inline mr-1.5" /> Multi-Scheme Check
        </button>
        <button
          onClick={() => setMode('diff')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'diff' ? 'bg-gov-navy text-white' : 'bg-gov-navy/5 text-gov-navy hover:bg-gov-navy/10'}`}
        >
          <GitCompare size={14} className="inline mr-1.5" /> Policy Diff
        </button>
      </div>

      {mode === 'multi' && (
        <div className="space-y-6">
          <div className="bg-white border border-gov-border rounded-xl p-5">
            <h3 className="font-semibold text-gov-navy mb-3">Select Schemes ({selectedDocs.length} selected)</h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {schemes.map((s) => (
                <label key={s.document_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gov-gold/5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(s.document_id)}
                    onChange={() => toggleScheme(s.document_id)}
                    className="rounded text-gov-navy"
                  />
                  <span className="flex-1 text-gov-navy">{s.scheme_name}</span>
                  <span className="text-xs text-gray-400">{s.rule_count} rules</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gov-border rounded-xl p-5">
            <h3 className="font-semibold text-gov-navy mb-3">Your Profile</h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(profile).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gov-navy/70 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gov-border rounded text-sm outline-none focus:ring-1 focus:ring-gov-blue bg-white"
                    placeholder="..."
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runMultiCheck}
            disabled={multiLoading || selectedDocs.length === 0}
            className="w-full bg-gov-navy text-white py-3 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {multiLoading ? <><Loader2 size={18} className="animate-spin" /> Checking...</> : <><Shield size={18} /> Check {selectedDocs.length} Schemes</>}
          </button>

          {multiResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-gov-green/5 border border-gov-green/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-green">{multiResult.summary.eligible}</div><div className="text-xs text-gov-green/70">Eligible</div></div>
                <div className="bg-gov-maroon/5 border border-gov-maroon/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-maroon">{multiResult.summary.not_eligible}</div><div className="text-xs text-gov-maroon/70">Not Eligible</div></div>
                <div className="bg-gov-saffron/5 border border-gov-saffron/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-saffron">{multiResult.summary.partial}</div><div className="text-xs text-gov-saffron/70">Partial</div></div>
                <div className="bg-gov-blue/5 border border-gov-blue/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-blue">{multiResult.summary.insufficient_data}</div><div className="text-xs text-gov-blue/70">Insufficient</div></div>
              </div>
              <div className="space-y-2">
                {multiResult.results.map((r) => (
                  <div key={r.session_id || r.document_id} className={`border rounded-lg p-4 flex items-center gap-3 ${verdictColor(r.overall_verdict)}`}>
                    <VerdictIcon verdict={r.overall_verdict} />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gov-navy">{r.scheme_name}</div>
                      <div className="text-xs opacity-75">{r.summary}</div>
                    </div>
                    <div className="text-xs text-right text-gov-navy/60">
                      <div>{r.matched_count}/{r.total_rules} matched</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'diff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gov-navy mb-1">Document A</label>
              <select value={docA} onChange={(e) => setDocA(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm outline-none bg-white focus:ring-1 focus:ring-gov-blue">
                <option value="">Select...</option>
                {schemes.map((s) => <option key={s.document_id} value={s.document_id}>{s.scheme_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gov-navy mb-1">Document B</label>
              <select value={docB} onChange={(e) => setDocB(e.target.value)} className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm outline-none bg-white focus:ring-1 focus:ring-gov-blue">
                <option value="">Select...</option>
                {schemes.map((s) => <option key={s.document_id} value={s.document_id}>{s.scheme_name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={runDiff}
            disabled={diffLoading || !docA || !docB}
            className="w-full bg-gov-navy text-white py-3 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {diffLoading ? <><Loader2 size={18} className="animate-spin" /> Comparing...</> : <><GitCompare size={18} /> Compare Documents</>}
          </button>

          {diffResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gov-navy/5 rounded-lg p-4 text-sm border border-gov-border">
                  <div className="font-medium text-gov-navy">{diffResult.document_a.name}</div>
                  <div className="text-gray-500">{diffResult.document_a.rule_count} rules</div>
                </div>
                <div className="bg-gov-navy/5 rounded-lg p-4 text-sm border border-gov-border">
                  <div className="font-medium text-gov-navy">{diffResult.document_b.name}</div>
                  <div className="text-gray-500">{diffResult.document_b.rule_count} rules</div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="bg-gov-green/10 text-gov-green px-3 py-1 rounded-full text-sm font-medium">+{diffResult.diff_summary.added} added</span>
                <span className="bg-gov-maroon/10 text-gov-maroon px-3 py-1 rounded-full text-sm font-medium">-{diffResult.diff_summary.removed} removed</span>
                <span className="bg-gov-saffron/10 text-gov-saffron px-3 py-1 rounded-full text-sm font-medium">~{diffResult.diff_summary.modified} modified</span>
                {diffResult.conflict_summary.total > 0 && (
                  <span className="bg-gov-maroon/10 text-gov-maroon px-3 py-1 rounded-full text-sm font-medium">
                    {diffResult.conflict_summary.total} conflicts ({diffResult.conflict_summary.high} high)
                  </span>
                )}
              </div>

              {diffResult.diffs.length > 0 && (
                <div className="bg-white border border-gov-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gov-navy/5 border-b border-gov-border font-medium text-sm text-gov-navy">Rule Changes</div>
                  {diffResult.diffs.map((d, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-100 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          d.change_type === 'added' ? 'bg-gov-green/10 text-gov-green' :
                          d.change_type === 'removed' ? 'bg-gov-maroon/10 text-gov-maroon' :
                          'bg-gov-saffron/10 text-gov-saffron'
                        }`}>{d.change_type.toUpperCase()}</span>
                        <span className="font-medium text-gov-navy">{d.field_label}</span>
                      </div>
                      <div className="text-gray-600 text-xs mt-1">{d.details}</div>
                    </div>
                  ))}
                </div>
              )}

              {diffResult.conflicts.length > 0 && (
                <div className="bg-white border border-gov-maroon/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gov-maroon/5 border-b border-gov-maroon/20 font-medium text-sm text-gov-maroon">Conflicts Detected</div>
                  {diffResult.conflicts.map((c) => (
                    <div key={c.conflict_id} className="px-4 py-3 border-b border-gov-maroon/10 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          c.severity === 'high' ? 'bg-gov-maroon/10 text-gov-maroon' :
                          c.severity === 'medium' ? 'bg-gov-saffron/10 text-gov-saffron' :
                          'bg-gov-gold/10 text-gov-gold'
                        }`}>{c.severity.toUpperCase()}</span>
                        <span className="font-medium text-gov-navy">{c.field}</span>
                        <span className="text-xs text-gray-400">{c.conflict_type}</span>
                      </div>
                      <div className="text-gray-700 mt-1">{c.description}</div>
                      <div className="text-gov-blue text-xs mt-1">{c.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
