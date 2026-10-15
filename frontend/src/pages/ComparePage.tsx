import { ArrowRight, CheckCircle, GitCompare, Loader2, Shield, XCircle, AlertCircle, HelpCircle } from 'lucide-react'
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
    if (verdict === 'ELIGIBLE') return <CheckCircle size={20} className="text-green-600" />
    if (verdict === 'NOT_ELIGIBLE') return <XCircle size={20} className="text-red-600" />
    if (verdict === 'PARTIAL') return <AlertCircle size={20} className="text-yellow-600" />
    return <HelpCircle size={20} className="text-blue-600" />
  }

  const verdictColor = (v: string) => {
    if (v === 'ELIGIBLE') return 'bg-green-50 border-green-200 text-green-700'
    if (v === 'NOT_ELIGIBLE') return 'bg-red-50 border-red-200 text-red-700'
    if (v === 'PARTIAL') return 'bg-yellow-50 border-yellow-200 text-yellow-700'
    return 'bg-blue-50 border-blue-200 text-blue-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare & Analyze</h1>
        <p className="text-gray-500 mt-1">Multi-scheme eligibility check or compare two policy documents</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('multi')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'multi' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <Shield size={14} className="inline mr-1.5" /> Multi-Scheme Check
        </button>
        <button
          onClick={() => setMode('diff')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'diff' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <GitCompare size={14} className="inline mr-1.5" /> Policy Diff
        </button>
      </div>

      {mode === 'multi' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Select Schemes ({selectedDocs.length} selected)</h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {schemes.map((s) => (
                <label key={s.document_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(s.document_id)}
                    onChange={() => toggleScheme(s.document_id)}
                    className="rounded text-indigo-600"
                  />
                  <span className="flex-1">{s.scheme_name}</span>
                  <span className="text-xs text-gray-400">{s.rule_count} rules</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Your Profile</h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(profile).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{key.replace(/_/g, ' ')}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="..."
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runMultiCheck}
            disabled={multiLoading || selectedDocs.length === 0}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {multiLoading ? <><Loader2 size={18} className="animate-spin" /> Checking...</> : <><Shield size={18} /> Check {selectedDocs.length} Schemes</>}
          </button>

          {multiResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-green-50 rounded-lg p-3"><div className="text-2xl font-bold text-green-700">{multiResult.summary.eligible}</div><div className="text-xs text-green-600">Eligible</div></div>
                <div className="bg-red-50 rounded-lg p-3"><div className="text-2xl font-bold text-red-700">{multiResult.summary.not_eligible}</div><div className="text-xs text-red-600">Not Eligible</div></div>
                <div className="bg-yellow-50 rounded-lg p-3"><div className="text-2xl font-bold text-yellow-700">{multiResult.summary.partial}</div><div className="text-xs text-yellow-600">Partial</div></div>
                <div className="bg-blue-50 rounded-lg p-3"><div className="text-2xl font-bold text-blue-700">{multiResult.summary.insufficient_data}</div><div className="text-xs text-blue-600">Insufficient</div></div>
              </div>
              <div className="space-y-2">
                {multiResult.results.map((r) => (
                  <div key={r.session_id || r.document_id} className={`border rounded-lg p-4 flex items-center gap-3 ${verdictColor(r.overall_verdict)}`}>
                    <VerdictIcon verdict={r.overall_verdict} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{r.scheme_name}</div>
                      <div className="text-xs opacity-75">{r.summary}</div>
                    </div>
                    <div className="text-xs text-right">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Document A</label>
              <select value={docA} onChange={(e) => setDocA(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                <option value="">Select...</option>
                {schemes.map((s) => <option key={s.document_id} value={s.document_id}>{s.scheme_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document B</label>
              <select value={docB} onChange={(e) => setDocB(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                <option value="">Select...</option>
                {schemes.map((s) => <option key={s.document_id} value={s.document_id}>{s.scheme_name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={runDiff}
            disabled={diffLoading || !docA || !docB}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {diffLoading ? <><Loader2 size={18} className="animate-spin" /> Comparing...</> : <><GitCompare size={18} /> Compare Documents</>}
          </button>

          {diffResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="font-medium">{diffResult.document_a.name}</div>
                  <div className="text-gray-500">{diffResult.document_a.rule_count} rules</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="font-medium">{diffResult.document_b.name}</div>
                  <div className="text-gray-500">{diffResult.document_b.rule_count} rules</div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">+{diffResult.diff_summary.added} added</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">-{diffResult.diff_summary.removed} removed</span>
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">~{diffResult.diff_summary.modified} modified</span>
                {diffResult.conflict_summary.total > 0 && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    {diffResult.conflict_summary.total} conflicts ({diffResult.conflict_summary.high} high)
                  </span>
                )}
              </div>

              {diffResult.diffs.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b font-medium text-sm text-gray-700">Rule Changes</div>
                  {diffResult.diffs.map((d, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-100 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          d.change_type === 'added' ? 'bg-green-100 text-green-700' :
                          d.change_type === 'removed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{d.change_type.toUpperCase()}</span>
                        <span className="font-medium text-gray-900">{d.field_label}</span>
                      </div>
                      <div className="text-gray-600 text-xs mt-1">{d.details}</div>
                    </div>
                  ))}
                </div>
              )}

              {diffResult.conflicts.length > 0 && (
                <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-red-50 border-b border-red-200 font-medium text-sm text-red-800">Conflicts Detected</div>
                  {diffResult.conflicts.map((c) => (
                    <div key={c.conflict_id} className="px-4 py-3 border-b border-red-100 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          c.severity === 'high' ? 'bg-red-100 text-red-700' :
                          c.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{c.severity.toUpperCase()}</span>
                        <span className="font-medium text-gray-900">{c.field}</span>
                        <span className="text-xs text-gray-400">{c.conflict_type}</span>
                      </div>
                      <div className="text-gray-700 mt-1">{c.description}</div>
                      <div className="text-indigo-600 text-xs mt-1">{c.recommendation}</div>
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
