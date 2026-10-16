import { ArrowRight, FolderOpen, Loader2, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRecommendations } from '../api/client'
import type { Recommendation } from '../types'

export default function RecommendedSchemes() {
  const navigate = useNavigate()
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [profileFields, setProfileFields] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecommendations()
      .then((r) => { setRecs(r.recommendations); setProfileFields(r.profile_field_count) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gov-navy dark:text-gov-gold" />
      </div>
    )
  }

  if (profileFields === 0) {
    return (
      <Link
        to="/documents"
        className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-5 py-4 hover:border-gov-navy/30 dark:hover:border-slate-500 transition-colors group"
      >
        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center shrink-0">
          <FolderOpen size={20} className="text-gray-400 dark:text-slate-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gov-navy dark:text-slate-100">Import documents to get personalised recommendations</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Upload Aadhaar, income cert, etc. to get matched to the right schemes</p>
        </div>
        <ArrowRight size={16} className="text-gov-navy dark:text-slate-400 group-hover:translate-x-1 transition-transform" />
      </Link>
    )
  }

  if (recs.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
        No strong matches found for your current profile. Try importing more documents.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {recs.map((rec) => (
        <div
          key={rec.id}
          className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3 hover:border-gov-gold/50 hover:shadow-sm transition-all"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gov-navy dark:text-slate-100 leading-snug line-clamp-2 flex-1">
              {rec.name}
            </p>
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gov-navy/5 dark:bg-white/10 text-gov-navy/60 dark:text-slate-400 whitespace-nowrap">
              {rec.level?.includes('Central') ? 'Central' : rec.level?.includes('State') ? 'State' : rec.level}
            </span>
          </div>

          {/* Match reasons */}
          {rec.match_reasons.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {rec.match_reasons.map((r) => (
                <span key={r} className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                  {r}
                </span>
              ))}
              {rec.has_structured_rules && (
                <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                  Rules verified
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2 flex-1">
            {rec.description?.replace(/^Introduction:\s*/i, '') || 'No description available'}
          </p>

          {/* Action */}
          <button
            onClick={() => {
              if (rec.has_structured_rules && rec.document_id) {
                navigate(`/check?doc=${rec.document_id}`)
              } else {
                navigate(`/catalog/${rec.id}`)
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 bg-gov-navy text-white py-2 rounded-lg text-xs font-medium hover:bg-gov-navy-light transition-colors"
          >
            {rec.has_structured_rules && rec.document_id ? (
              <><Shield size={12} /> Check Eligibility</>
            ) : (
              <><Shield size={12} /> View Scheme</>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
