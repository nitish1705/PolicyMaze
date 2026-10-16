import { AlertCircle, CheckCircle, Clock, HelpCircle, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface Assessment {
  bundle_id: string
  session_id: string
  document_id: string
  scheme_name: string
  overall_verdict: string
  summary: string
  timestamp: string
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ts
  }
}

const verdictConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string; dot: string }> = {
  ELIGIBLE: { icon: CheckCircle, color: 'text-emerald-700 dark:text-emerald-400', label: 'Eligible', dot: 'bg-emerald-500' },
  NOT_ELIGIBLE: { icon: XCircle, color: 'text-red-700 dark:text-red-400', label: 'Not Eligible', dot: 'bg-red-500' },
  PARTIAL: { icon: AlertCircle, color: 'text-amber-700 dark:text-amber-400', label: 'Partial', dot: 'bg-amber-500' },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: 'text-slate-500 dark:text-slate-400', label: 'Need More Data', dot: 'bg-slate-400' },
}

export default function AssessmentHistory() {
  const { t } = useTranslation()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || '/api'
    fetch(`${base}/eligibility/history`)
      .then((r) => r.json())
      .then((data) => setAssessments(data.assessments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: assessments.length,
    eligible: assessments.filter((a) => a.overall_verdict === 'ELIGIBLE').length,
    not_eligible: assessments.filter((a) => a.overall_verdict === 'NOT_ELIGIBLE').length,
    partial: assessments.filter((a) => a.overall_verdict === 'PARTIAL').length,
    insufficient: assessments.filter((a) => a.overall_verdict === 'INSUFFICIENT_DATA').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-navy rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy dark:text-slate-100">{t('history.title')}</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm ml-3">{t('history.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gov-navy dark:text-gov-gold" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-10 text-center">
          <Clock size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-gov-navy dark:text-slate-100 font-medium">{t('history.noAssessments')}</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{t('history.noAssessmentsDesc')}</p>
          <Link
            to="/catalog"
            className="inline-block mt-4 bg-gov-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gov-navy-light transition-colors"
          >
            {t('history.browseSchemes')}
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: t('history.totalChecks'), value: stats.total, dot: 'bg-gov-navy' },
              { label: t('history.eligible'), value: stats.eligible, dot: 'bg-emerald-500' },
              { label: t('history.notEligible'), value: stats.not_eligible, dot: 'bg-red-500' },
              { label: t('history.partial'), value: stats.partial, dot: 'bg-amber-500' },
              { label: t('history.needMoreData'), value: stats.insufficient, dot: 'bg-slate-400' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-xl font-bold text-gov-navy dark:text-slate-100">{s.value}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Assessment list */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {assessments.map((a, idx) => {
              const cfg = verdictConfig[a.overall_verdict] || verdictConfig.INSUFFICIENT_DATA
              const Icon = cfg.icon
              return (
                <div
                  key={a.bundle_id}
                  className={`flex items-center gap-4 px-5 py-4 ${idx !== assessments.length - 1 ? 'border-b border-gray-100 dark:border-slate-700' : ''} hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gov-navy dark:text-slate-100 text-sm">{a.scheme_name}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{a.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400 dark:text-slate-500">{formatTime(a.timestamp)}</div>
                    <Link
                      to={`/check?doc=${a.document_id}`}
                      className="text-xs text-gov-navy dark:text-gov-gold font-medium hover:underline mt-1 inline-block"
                    >
                      {t('history.recheck')}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
