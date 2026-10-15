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

export default function AssessmentHistory() {
  const { t } = useTranslation()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  const verdictConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string }> = {
    ELIGIBLE: { icon: CheckCircle, color: 'text-gov-green', bg: 'bg-gov-green/5 dark:bg-gov-green/10', border: 'border-gov-green/20', label: t('history.eligible') },
    NOT_ELIGIBLE: { icon: XCircle, color: 'text-gov-maroon', bg: 'bg-gov-maroon/5 dark:bg-gov-maroon/10', border: 'border-gov-maroon/20', label: t('history.notEligible') },
    PARTIAL: { icon: AlertCircle, color: 'text-gov-saffron', bg: 'bg-gov-saffron/5 dark:bg-gov-saffron/10', border: 'border-gov-saffron/20', label: t('history.partial') },
    INSUFFICIENT_DATA: { icon: HelpCircle, color: 'text-gov-blue', bg: 'bg-gov-blue/5 dark:bg-gov-blue/10', border: 'border-gov-blue/20', label: t('eligibility.verdicts.INSUFFICIENT_DATA') },
  }

  useEffect(() => {
    fetch('/api/eligibility/history')
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
        <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-10 text-center">
          <Clock size={40} className="mx-auto text-gov-navy/20 dark:text-slate-600 mb-3" />
          <p className="text-gov-navy dark:text-slate-100 font-medium">{t('history.noAssessments')}</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            {t('history.noAssessmentsDesc')}
          </p>
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
              { label: t('history.totalChecks'), value: stats.total, color: 'border-gov-navy bg-gov-navy/5 dark:bg-gov-navy/20', text: 'text-gov-navy dark:text-slate-100' },
              { label: t('history.eligible'), value: stats.eligible, color: 'border-gov-green bg-gov-green/5 dark:bg-gov-green/10', text: 'text-gov-green' },
              { label: t('history.notEligible'), value: stats.not_eligible, color: 'border-gov-maroon bg-gov-maroon/5 dark:bg-gov-maroon/10', text: 'text-gov-maroon' },
              { label: t('history.partial'), value: stats.partial, color: 'border-gov-saffron bg-gov-saffron/5 dark:bg-gov-saffron/10', text: 'text-gov-saffron' },
              { label: t('history.needMoreData'), value: stats.insufficient, color: 'border-gov-blue bg-gov-blue/5 dark:bg-gov-blue/10', text: 'text-gov-blue' },
            ].map((s) => (
              <div key={s.label} className={`border-l-4 ${s.color} rounded-r-lg p-3`}>
                <div className={`text-xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Assessment list */}
          <div className="space-y-2">
            {assessments.map((a) => {
              const cfg = verdictConfig[a.overall_verdict] || verdictConfig.INSUFFICIENT_DATA
              const Icon = cfg.icon
              return (
                <div
                  key={a.bundle_id}
                  className={`${cfg.bg} border ${cfg.border} rounded-lg p-4 flex items-center gap-4`}
                >
                  <Icon size={24} className={cfg.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gov-navy dark:text-slate-100 text-sm">{a.scheme_name}</span>
                      <span className={`text-xs font-bold ${cfg.color} px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 truncate">{a.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gov-navy/50 dark:text-slate-500">{formatTime(a.timestamp)}</div>
                    <Link
                      to={`/check?doc=${a.document_id}`}
                      className="text-xs text-gov-blue font-medium hover:underline mt-1 inline-block"
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
