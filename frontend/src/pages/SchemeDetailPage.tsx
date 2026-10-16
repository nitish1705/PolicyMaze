import { ArrowLeft, CheckCircle, ExternalLink, FileText, Loader2, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL || '/api'

interface SchemeDetail {
  id: string
  name: string
  slug: string
  level: string
  state: string | null
  ministry: string | null
  category: string | null
  tags: string | null
  description: string | null
  eligibility_text: string | null
  exclusions_text: string | null
  benefits: string | null
  documents_required: string | null
  application_url: string | null
  source_url: string | null
  has_structured_rules: number
  document_id: string | null
}

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {}
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

function parseList(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {}
  return raw.split('\n').map((l) => l.trim()).filter(Boolean)
}

export default function SchemeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [scheme, setScheme] = useState<SchemeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`${BASE}/catalog/${id}`)
      .then((r) => r.json())
      .then((data) => setScheme(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleCheckEligibility = async () => {
    if (!scheme) return
    if (scheme.has_structured_rules && scheme.document_id) {
      navigate(`/check?doc=${scheme.document_id}`)
      return
    }
    setExtracting(true)
    try {
      const res = await fetch(`${BASE}/catalog/${scheme.id}/extract`, { method: 'POST' })
      const body = await res.json()
      if (body.document_id) {
        navigate(`/check?doc=${body.document_id}`)
      }
    } catch {
      alert('Rule extraction failed. Please try again.')
    } finally {
      setExtracting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-gov-navy" />
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="text-center py-20">
        <p className="text-gov-navy font-medium">Scheme not found.</p>
        <Link to="/catalog" className="text-gov-blue text-sm mt-2 inline-block hover:underline">Back to Catalog</Link>
      </div>
    )
  }

  const tags = parseTags(scheme.tags)
  const eligibilityItems = parseList(scheme.eligibility_text)
  const exclusionItems = parseList(scheme.exclusions_text)
  const documentItems = parseList(scheme.documents_required)
  const description = (scheme.description || '').replace(/^Introduction:\s*/i, '')

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-gov-navy/60 hover:text-gov-navy transition-colors">
        <ArrowLeft size={16} /> Back to Scheme Catalog
      </Link>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gov-navy">{scheme.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {scheme.level && (
                <span className="text-xs bg-gov-navy/5 text-gov-navy/70 px-2.5 py-1 rounded-full font-medium">
                  {scheme.level}
                </span>
              )}
              {scheme.state && (
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">
                  {scheme.state}
                </span>
              )}
              {scheme.category && (
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium capitalize">
                  {scheme.category.replace(/_/g, ' ')}
                </span>
              )}
              {scheme.ministry && (
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">
                  {scheme.ministry}
                </span>
              )}
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gov-cream text-gov-navy/60 px-2 py-0.5 rounded-full capitalize">
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleCheckEligibility}
            disabled={extracting}
            className="shrink-0 flex items-center gap-2 bg-gov-navy text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gov-navy-light disabled:opacity-50 transition-colors"
          >
            {extracting ? (
              <><Loader2 size={16} className="animate-spin" /> Extracting Rules...</>
            ) : (
              <><Shield size={16} /> Check Eligibility</>
            )}
          </button>
        </div>
      </div>

      {description && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-gov-navy rounded-full" />
            <h2 className="text-base font-semibold text-gov-navy dark:text-slate-100">About This Scheme</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eligibilityItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gov-navy rounded-full" />
              <h2 className="text-base font-semibold text-gov-navy dark:text-slate-100">Eligibility Criteria</h2>
            </div>
            <ul className="space-y-2">
              {eligibilityItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle size={14} className="text-gray-400 dark:text-slate-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {scheme.benefits && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gov-navy rounded-full" />
              <h2 className="text-base font-semibold text-gov-navy dark:text-slate-100">Benefits</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{scheme.benefits}</p>
          </div>
        )}

        {exclusionItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gov-navy rounded-full" />
              <h2 className="text-base font-semibold text-gov-navy dark:text-slate-100">Exclusions</h2>
            </div>
            <ul className="space-y-2">
              {exclusionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 dark:text-slate-500 mt-0.5 shrink-0">×</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {documentItems.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gov-navy rounded-full" />
              <h2 className="text-base font-semibold text-gov-navy dark:text-slate-100">Documents Required</h2>
            </div>
            <ul className="space-y-2">
              {documentItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <FileText size={14} className="text-gray-400 dark:text-slate-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {scheme.application_url && (
        <div className="bg-gov-cream border border-gov-gold/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gov-navy">Apply Online</div>
            <div className="text-xs text-gray-500 mt-0.5">Visit the official application portal</div>
          </div>
          <a
            href={scheme.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-gov-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gov-navy-light transition-colors"
          >
            Apply Now <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  )
}
