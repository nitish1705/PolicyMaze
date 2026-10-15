import { ChevronLeft, ChevronRight, Filter, Loader2, Search, Shield, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCatalogFilters } from '../api/client'

interface CatalogScheme {
  id: string
  name: string
  slug: string
  level: string
  state: string | null
  ministry: string | null
  category: string | null
  tags: string
  description: string
  has_structured_rules: boolean
  document_id: string | null
  source_repo: string
}

interface CatalogResponse {
  schemes: CatalogScheme[]
  total: number
  page: number
  per_page: number
  pages: number
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {}
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

const selectCls = "px-3 py-2 border border-gov-border dark:border-slate-600 rounded-lg text-sm outline-none bg-white dark:bg-slate-700 text-gov-navy dark:text-slate-100 focus:ring-1 focus:ring-gov-blue"

export default function CatalogPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<CatalogResponse | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState<string | null>(null)

  const [levelFilter, setLevelFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [filterOptions, setFilterOptions] = useState<{ states: string[]; levels: string[]; categories: string[] }>({ states: [], levels: [], categories: [] })

  useEffect(() => {
    getCatalogFilters().then(setFilterOptions).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [levelFilter, stateFilter, categoryFilter])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), per_page: '15' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (levelFilter) params.set('level', levelFilter)
    if (stateFilter) params.set('state', stateFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/catalog?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedSearch, page, levelFilter, stateFilter, categoryFilter])

  const handleCheckEligibility = async (scheme: CatalogScheme) => {
    if (scheme.has_structured_rules && scheme.document_id) {
      navigate(`/check?doc=${scheme.document_id}`)
      return
    }
    setExtracting(scheme.id)
    try {
      const res = await fetch(`/api/catalog/${scheme.id}/extract`, { method: 'POST' })
      const body = await res.json()
      if (body.document_id) navigate(`/check?doc=${body.document_id}`)
    } catch {
      alert('Rule extraction failed. Please try again.')
    } finally {
      setExtracting(null)
    }
  }

  const hasFilters = levelFilter || stateFilter || categoryFilter
  const clearFilters = () => { setLevelFilter(''); setStateFilter(''); setCategoryFilter('') }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-saffron rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy dark:text-slate-100">Scheme Catalog</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm ml-3">
          Browse {data?.total || '2,000+'} Indian government schemes. Click any scheme to check eligibility.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gov-navy dark:text-slate-300" />
          <span className="text-sm font-medium text-gov-navy dark:text-slate-200">Filter Schemes</span>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-gov-maroon hover:text-gov-maroon/80 transition-colors">
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={selectCls}>
            <option value="">All Levels</option>
            {filterOptions.levels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className={selectCls}>
            <option value="">All States</option>
            {filterOptions.states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls}>
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schemes by name, state, tags..."
          className="w-full pl-10 pr-4 py-3 border border-gov-border dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gov-navy dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-gov-blue focus:border-gov-blue outline-none"
        />
      </div>

      {data && (
        <div className="text-sm text-gray-500 dark:text-slate-400">
          <span>{data.total} schemes found</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gov-navy dark:text-gov-gold" />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-lg p-4 hover:border-gov-gold/50 hover:shadow-sm dark:hover:shadow-none transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/catalog/${scheme.id}`}
                      className="font-medium text-gov-navy dark:text-slate-100 text-sm hover:text-gov-blue hover:underline transition-colors"
                    >
                      {scheme.name}
                    </Link>
                    {scheme.level && (
                      <span className="text-xs bg-gov-navy/5 dark:bg-white/10 text-gov-navy/70 dark:text-slate-400 px-2 py-0.5 rounded">
                        {scheme.level.includes('Central') ? 'Central' : scheme.level.includes('State') ? 'State' : scheme.level}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {(scheme.description || '').replace(/^Introduction:\s*/i, '')}
                  </p>
                  {scheme.tags && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {parseTags(scheme.tags).slice(0, 4).map((tag) => (
                        <span key={tag} className="text-xs bg-gov-blue/10 text-gov-blue px-2 py-0.5 rounded-full capitalize">
                          {tag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <button
                    onClick={() => handleCheckEligibility(scheme)}
                    disabled={extracting === scheme.id}
                    className="flex items-center gap-1.5 bg-gov-navy text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gov-navy-light disabled:opacity-50 transition-colors"
                  >
                    {extracting === scheme.id ? (
                      <><Loader2 size={14} className="animate-spin" /> Preparing...</>
                    ) : (
                      <><Shield size={14} /> Check Eligibility</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 border border-gov-border dark:border-slate-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gov-gold/5 dark:hover:bg-white/5 text-gov-navy dark:text-slate-200 transition-colors"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gov-navy/70 dark:text-slate-400">
            Page {data.page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="flex items-center gap-1 px-3 py-2 border border-gov-border dark:border-slate-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gov-gold/5 dark:hover:bg-white/5 text-gov-navy dark:text-slate-200 transition-colors"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
