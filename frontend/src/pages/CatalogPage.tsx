import { ChevronLeft, ChevronRight, Loader2, Search, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

export default function CatalogPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<CatalogResponse | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), per_page: '15' })
    if (debouncedSearch) params.set('search', debouncedSearch)

    fetch(`/api/catalog?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedSearch, page])

  const handleCheckEligibility = async (scheme: CatalogScheme) => {
    if (scheme.has_structured_rules && scheme.document_id) {
      navigate(`/check?doc=${scheme.document_id}`)
      return
    }
    setExtracting(scheme.id)
    try {
      const res = await fetch(`/api/catalog/${scheme.id}/extract`, { method: 'POST' })
      const body = await res.json()
      if (body.document_id) {
        navigate(`/check?doc=${body.document_id}`)
      }
    } catch {
      alert('Rule extraction failed. Please try again.')
    } finally {
      setExtracting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-saffron rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy">Scheme Catalog</h1>
        </div>
        <p className="text-gray-500 text-sm ml-3">
          Browse {data?.total || '2,000+'} Indian government schemes. Click any scheme to check eligibility.
        </p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schemes by name, state, tags..."
          className="w-full pl-10 pr-4 py-3 border border-gov-border rounded-xl text-sm bg-white focus:ring-2 focus:ring-gov-blue focus:border-gov-blue outline-none"
        />
      </div>

      {data && (
        <div className="text-sm text-gray-500">
          <span>{data.total} schemes found</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gov-navy" />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white border border-gov-border rounded-lg p-4 hover:border-gov-gold/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gov-navy text-sm">{scheme.name}</h3>
                    {scheme.level && (
                      <span className="text-xs bg-gov-navy/5 text-gov-navy/70 px-2 py-0.5 rounded">
                        {scheme.level.includes('Central') ? 'Central' : scheme.level.includes('State') ? 'State' : scheme.level}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scheme.description}</p>
                  {scheme.tags && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {scheme.tags.split(',').slice(0, 4).map((tag) => (
                        <span key={tag} className="text-xs bg-gov-blue/10 text-gov-blue px-1.5 py-0.5 rounded">
                          {tag.trim()}
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
            className="flex items-center gap-1 px-3 py-2 border border-gov-border rounded-lg text-sm disabled:opacity-50 hover:bg-gov-gold/5 text-gov-navy"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gov-navy/70">
            Page {data.page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="flex items-center gap-1 px-3 py-2 border border-gov-border rounded-lg text-sm disabled:opacity-50 hover:bg-gov-gold/5 text-gov-navy"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
