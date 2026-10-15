import { AlertCircle, ArrowRight, CheckCircle, FolderOpen, GitCompare, HelpCircle, Loader2, Search, Shield, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCitizenProfile } from '../api/client'

const BASE = import.meta.env.VITE_API_URL || '/api'

interface CatalogScheme {
  id: string
  name: string
  level: string
  state: string | null
  category: string | null
  tags: string
  has_structured_rules: boolean
  document_id: string | null
}

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
  summary: { total_schemes: number; eligible: number; not_eligible: number; partial: number; insufficient_data: number }
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
  const [catalogSchemes, setCatalogSchemes] = useState<CatalogScheme[]>([])
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [mode, setMode] = useState<'multi' | 'diff'>('multi')

  const [selectedSchemes, setSelectedSchemes] = useState<Map<string, CatalogScheme>>(new Map())
  const [citizenProfile, setCitizenProfile] = useState<Record<string, unknown>>({})
  const [profileLoading, setProfileLoading] = useState(true)
  const [multiResult, setMultiResult] = useState<MultiResponse | null>(null)
  const [multiLoading, setMultiLoading] = useState(false)

  const [diffResults, setDiffResults] = useState<DiffResponse[]>([])
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffSchemes, setDiffSchemes] = useState<Map<string, CatalogScheme>>(new Map())

  useEffect(() => {
    getCitizenProfile()
      .then(({ profile: p }) => setCitizenProfile(p || {}))
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(catalogSearch); setCatalogPage(1) }, 300)
    return () => clearTimeout(t)
  }, [catalogSearch])

  useEffect(() => {
    setCatalogLoading(true)
    const params = new URLSearchParams({ page: String(catalogPage), per_page: '20' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    fetch(`${BASE}/catalog?${params}`)
      .then((r) => r.json())
      .then((data) => { setCatalogSchemes(data.schemes || []); setCatalogTotal(data.total || 0) })
      .catch(() => {})
      .finally(() => setCatalogLoading(false))
  }, [debouncedSearch, catalogPage])

  const toggleScheme = (scheme: CatalogScheme) => {
    setSelectedSchemes((prev) => { const n = new Map(prev); n.has(scheme.id) ? n.delete(scheme.id) : n.set(scheme.id, scheme); return n })
  }
  const toggleDiffScheme = (scheme: CatalogScheme) => {
    setDiffSchemes((prev) => { const n = new Map(prev); n.has(scheme.id) ? n.delete(scheme.id) : n.set(scheme.id, scheme); return n })
  }

  const selectedDocs = [...selectedSchemes.values()]
  const diffDocs = [...diffSchemes.values()]
  const profileFields = Object.entries(citizenProfile).filter(([, v]) => v !== null && v !== undefined && v !== '')
  const hasProfile = profileFields.length > 0

  const ensureDocumentId = async (scheme: CatalogScheme): Promise<string | null> => {
    if (scheme.has_structured_rules && scheme.document_id) return scheme.document_id
    try {
      const res = await fetch(`${BASE}/catalog/${scheme.id}/extract`, { method: 'POST' })
      const body = await res.json()
      return body.document_id || null
    } catch { return null }
  }

  const runMultiCheck = async () => {
    if (selectedDocs.length === 0) return
    setMultiLoading(true); setMultiResult(null)
    try {
      const docIds = await Promise.all(selectedDocs.map(ensureDocumentId))
      const validIds = docIds.filter((id): id is string => id !== null)
      if (validIds.length === 0) return
      const res = await fetch(`${BASE}/eligibility/multi-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: validIds, profile: citizenProfile }),
      })
      setMultiResult(await res.json())
    } catch { /* ignore */ }
    finally { setMultiLoading(false) }
  }

  const runDiff = async () => {
    if (diffDocs.length < 2) return
    setDiffLoading(true); setDiffResults([])
    try {
      const docIds = await Promise.all(diffDocs.map(ensureDocumentId))
      const validIds = docIds.filter((id): id is string => id !== null)
      if (validIds.length < 2) return
      const results: DiffResponse[] = []
      for (let i = 0; i < validIds.length - 1; i++) {
        const res = await fetch(`${BASE}/documents/diff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id_a: validIds[i], document_id_b: validIds[i + 1] }),
        })
        results.push(await res.json())
      }
      setDiffResults(results)
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
    if (v === 'ELIGIBLE') return 'bg-gov-green/5 dark:bg-gov-green/10 border-gov-green/30 text-gov-green'
    if (v === 'NOT_ELIGIBLE') return 'bg-gov-maroon/5 dark:bg-gov-maroon/10 border-gov-maroon/30 text-gov-maroon'
    if (v === 'PARTIAL') return 'bg-gov-saffron/5 dark:bg-gov-saffron/10 border-gov-saffron/30 text-gov-saffron'
    return 'bg-gov-blue/5 dark:bg-gov-blue/10 border-gov-blue/30 text-gov-blue'
  }

  const searchInputCls = "w-full pl-9 pr-3 py-2 border border-gov-border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gov-navy dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-gov-blue"
  const schemeListCls = "max-h-56 overflow-y-auto space-y-0.5 border border-gov-border/50 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-gold rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy dark:text-slate-100">Compare & Analyze</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm ml-3">Multi-scheme eligibility check or compare two policy documents</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('multi')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'multi' ? 'bg-gov-navy text-white' : 'bg-gov-navy/5 dark:bg-white/5 text-gov-navy dark:text-slate-200 hover:bg-gov-navy/10 dark:hover:bg-white/10'}`}
        >
          <Shield size={14} className="inline mr-1.5" /> Multi-Scheme Check
        </button>
        <button
          onClick={() => setMode('diff')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'diff' ? 'bg-gov-navy text-white' : 'bg-gov-navy/5 dark:bg-white/5 text-gov-navy dark:text-slate-200 hover:bg-gov-navy/10 dark:hover:bg-white/10'}`}
        >
          <GitCompare size={14} className="inline mr-1.5" /> Policy Diff
        </button>
      </div>

      {mode === 'multi' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gov-navy dark:text-slate-100">Select Schemes ({selectedSchemes.size} selected)</h3>
              <span className="text-xs text-gray-400 dark:text-slate-500">{catalogTotal} schemes available</span>
            </div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Search schemes..." className={searchInputCls} />
            </div>
            {selectedSchemes.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[...selectedSchemes.values()].map((s) => (
                  <span key={s.id} onClick={() => toggleScheme(s)} className="text-xs bg-gov-navy/10 dark:bg-white/10 text-gov-navy dark:text-slate-200 px-2 py-1 rounded-full cursor-pointer hover:bg-gov-maroon/10 hover:text-gov-maroon transition-colors">
                    {s.name} ×
                  </span>
                ))}
              </div>
            )}
            <div className={schemeListCls}>
              {catalogLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-gov-navy/40 dark:text-slate-500" /></div>
              ) : catalogSchemes.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500">No schemes found</div>
              ) : (
                <>
                  {catalogSchemes.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gov-gold/5 dark:hover:bg-white/5 cursor-pointer text-sm border-b border-gov-border/20 dark:border-slate-700/50 last:border-0">
                      <input type="checkbox" checked={selectedSchemes.has(s.id)} onChange={() => toggleScheme(s)} className="rounded text-gov-navy shrink-0" />
                      <span className="flex-1 text-gov-navy dark:text-slate-200 truncate">{s.name}</span>
                      {s.level && <span className="text-[10px] bg-gov-navy/5 dark:bg-white/10 text-gov-navy/50 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">{s.level.includes('Central') ? 'Central' : 'State'}</span>}
                    </label>
                  ))}
                  {catalogTotal > 20 && (
                    <div className="flex items-center justify-center gap-3 py-2 border-t border-gov-border/30 dark:border-slate-700">
                      <button onClick={() => setCatalogPage((p) => Math.max(1, p - 1))} disabled={catalogPage <= 1} className="text-xs text-gov-navy/60 dark:text-slate-400 hover:text-gov-navy dark:hover:text-slate-200 disabled:opacity-30">← Prev</button>
                      <span className="text-xs text-gray-400 dark:text-slate-500">Page {catalogPage}</span>
                      <button onClick={() => setCatalogPage((p) => p + 1)} disabled={catalogSchemes.length < 20} className="text-xs text-gov-navy/60 dark:text-slate-400 hover:text-gov-navy dark:hover:text-slate-200 disabled:opacity-30">Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gov-navy dark:text-slate-100">Your Profile</h3>
              {hasProfile && <span className="text-xs text-gov-green font-medium flex items-center gap-1"><CheckCircle size={12} /> {profileFields.length} fields</span>}
            </div>
            {profileLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 size={18} className="animate-spin text-gov-navy/40" /></div>
            ) : hasProfile ? (
              <div className="flex flex-wrap gap-2">
                {profileFields.map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 bg-gov-green/5 dark:bg-gov-green/10 border border-gov-green/20 rounded-lg px-3 py-1.5">
                    <CheckCircle size={12} className="text-gov-green" />
                    <span className="text-xs text-gov-navy dark:text-slate-200 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gov-green font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Link to="/documents" className="flex items-center gap-3 bg-gov-saffron/5 dark:bg-gov-saffron/10 border border-gov-saffron/20 rounded-lg px-4 py-4 hover:border-gov-gold transition-colors group">
                <FolderOpen size={20} className="text-gov-saffron" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gov-navy dark:text-slate-100">Import your documents first</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">Upload Aadhaar, income certificate, etc. to auto-fill your profile</div>
                </div>
                <div className="flex items-center gap-1 text-gov-gold text-xs font-medium group-hover:gap-2 transition-all">Import <ArrowRight size={12} /></div>
              </Link>
            )}
          </div>

          <button onClick={runMultiCheck} disabled={multiLoading || selectedSchemes.size === 0} className="w-full bg-gov-navy text-white py-3 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {multiLoading ? <><Loader2 size={18} className="animate-spin" /> Extracting rules & checking...</> : <><Shield size={18} /> Check {selectedSchemes.size} Schemes</>}
          </button>

          {multiResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-gov-green/5 dark:bg-gov-green/10 border border-gov-green/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-green">{multiResult.summary.eligible}</div><div className="text-xs text-gov-green/70">Eligible</div></div>
                <div className="bg-gov-maroon/5 dark:bg-gov-maroon/10 border border-gov-maroon/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-maroon">{multiResult.summary.not_eligible}</div><div className="text-xs text-gov-maroon/70">Not Eligible</div></div>
                <div className="bg-gov-saffron/5 dark:bg-gov-saffron/10 border border-gov-saffron/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-saffron">{multiResult.summary.partial}</div><div className="text-xs text-gov-saffron/70">Partial</div></div>
                <div className="bg-gov-blue/5 dark:bg-gov-blue/10 border border-gov-blue/20 rounded-lg p-3"><div className="text-2xl font-bold text-gov-blue">{multiResult.summary.insufficient_data}</div><div className="text-xs text-gov-blue/70">Insufficient</div></div>
              </div>
              <div className="space-y-2">
                {multiResult.results.map((r) => (
                  <div key={r.session_id || r.document_id} className={`border rounded-lg p-4 flex items-center gap-3 ${verdictColor(r.overall_verdict)}`}>
                    <VerdictIcon verdict={r.overall_verdict} />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gov-navy dark:text-slate-100">{r.scheme_name}</div>
                      <div className="text-xs opacity-75">{r.summary}</div>
                    </div>
                    <div className="text-xs text-right text-gov-navy/60 dark:text-slate-400">
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
          <p className="text-xs text-gray-500 dark:text-slate-400 -mt-2">Select multiple policies to compare rules and detect conflicts between them</p>

          <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gov-navy dark:text-slate-100">Select Policies to Compare ({diffSchemes.size} selected)</h3>
              <span className="text-xs text-gray-400 dark:text-slate-500">{catalogTotal} schemes available</span>
            </div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Search schemes..." className={searchInputCls} />
            </div>
            {diffSchemes.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[...diffSchemes.values()].map((s) => (
                  <span key={s.id} onClick={() => toggleDiffScheme(s)} className="text-xs bg-gov-navy/10 dark:bg-white/10 text-gov-navy dark:text-slate-200 px-2 py-1 rounded-full cursor-pointer hover:bg-gov-maroon/10 hover:text-gov-maroon transition-colors">
                    {s.name} ×
                  </span>
                ))}
              </div>
            )}
            <div className={schemeListCls}>
              {catalogLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-gov-navy/40 dark:text-slate-500" /></div>
              ) : catalogSchemes.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500">No schemes found</div>
              ) : (
                <>
                  {catalogSchemes.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gov-gold/5 dark:hover:bg-white/5 cursor-pointer text-sm border-b border-gov-border/20 dark:border-slate-700/50 last:border-0">
                      <input type="checkbox" checked={diffSchemes.has(s.id)} onChange={() => toggleDiffScheme(s)} className="rounded text-gov-navy shrink-0" />
                      <span className="flex-1 text-gov-navy dark:text-slate-200 truncate">{s.name}</span>
                      {s.level && <span className="text-[10px] bg-gov-navy/5 dark:bg-white/10 text-gov-navy/50 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">{s.level.includes('Central') ? 'Central' : 'State'}</span>}
                    </label>
                  ))}
                  {catalogTotal > 20 && (
                    <div className="flex items-center justify-center gap-3 py-2 border-t border-gov-border/30 dark:border-slate-700">
                      <button onClick={() => setCatalogPage((p) => Math.max(1, p - 1))} disabled={catalogPage <= 1} className="text-xs text-gov-navy/60 dark:text-slate-400 hover:text-gov-navy dark:hover:text-slate-200 disabled:opacity-30">← Prev</button>
                      <span className="text-xs text-gray-400 dark:text-slate-500">Page {catalogPage}</span>
                      <button onClick={() => setCatalogPage((p) => p + 1)} disabled={catalogSchemes.length < 20} className="text-xs text-gov-navy/60 dark:text-slate-400 hover:text-gov-navy dark:hover:text-slate-200 disabled:opacity-30">Next →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <button onClick={runDiff} disabled={diffLoading || diffSchemes.size < 2} className="w-full bg-gov-navy text-white py-3 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {diffLoading ? <><Loader2 size={18} className="animate-spin" /> Comparing...</> : <><GitCompare size={18} /> Compare {diffSchemes.size} Documents</>}
          </button>

          {diffResults.map((diffResult, idx) => (
            <div key={idx} className="space-y-4 border border-gov-border dark:border-slate-700 rounded-xl p-5 bg-white dark:bg-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gov-navy/5 dark:bg-white/5 rounded-lg p-4 text-sm border border-gov-border dark:border-slate-700">
                  <div className="font-medium text-gov-navy dark:text-slate-100">{diffResult.document_a.name}</div>
                  <div className="text-gray-500 dark:text-slate-400">{diffResult.document_a.rule_count} rules</div>
                </div>
                <div className="bg-gov-navy/5 dark:bg-white/5 rounded-lg p-4 text-sm border border-gov-border dark:border-slate-700 flex items-center gap-2">
                  <ArrowRight size={16} className="text-gov-gold shrink-0" />
                  <div>
                    <div className="font-medium text-gov-navy dark:text-slate-100">{diffResult.document_b.name}</div>
                    <div className="text-gray-500 dark:text-slate-400">{diffResult.document_b.rule_count} rules</div>
                  </div>
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
                <div className="border border-gov-border dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gov-navy/5 dark:bg-white/5 border-b border-gov-border dark:border-slate-700 font-medium text-sm text-gov-navy dark:text-slate-200">Rule Changes</div>
                  {diffResult.diffs.map((d, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.change_type === 'added' ? 'bg-gov-green/10 text-gov-green' : d.change_type === 'removed' ? 'bg-gov-maroon/10 text-gov-maroon' : 'bg-gov-saffron/10 text-gov-saffron'}`}>{d.change_type.toUpperCase()}</span>
                        <span className="font-medium text-gov-navy dark:text-slate-100">{d.field_label}</span>
                      </div>
                      <div className="text-gray-600 dark:text-slate-400 text-xs mt-1">{d.details}</div>
                    </div>
                  ))}
                </div>
              )}

              {diffResult.conflicts.length > 0 && (
                <div className="border border-gov-maroon/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gov-maroon/5 dark:bg-gov-maroon/10 border-b border-gov-maroon/20 font-medium text-sm text-gov-maroon">Conflicts Detected</div>
                  {diffResult.conflicts.map((c) => (
                    <div key={c.conflict_id} className="px-4 py-3 border-b border-gov-maroon/10 dark:border-gov-maroon/20 last:border-0 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.severity === 'high' ? 'bg-gov-maroon/10 text-gov-maroon' : c.severity === 'medium' ? 'bg-gov-saffron/10 text-gov-saffron' : 'bg-gov-gold/10 text-gov-gold'}`}>{c.severity.toUpperCase()}</span>
                        <span className="font-medium text-gov-navy dark:text-slate-100">{c.field}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{c.conflict_type}</span>
                      </div>
                      <div className="text-gray-700 dark:text-slate-300 mt-1">{c.description}</div>
                      <div className="text-gov-blue text-xs mt-1">{c.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
