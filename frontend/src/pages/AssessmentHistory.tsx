import { AlertCircle, CheckCircle, Clock, HelpCircle, Loader2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
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

const verdictConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string }> = {
  ELIGIBLE: { icon: CheckCircle, color: 'text-gov-green', bg: 'bg-gov-green/5', border: 'border-gov-green/20', label: 'Eligible' },
  NOT_ELIGIBLE: { icon: XCircle, color: 'text-gov-maroon', bg: 'bg-gov-maroon/5', border: 'border-gov-maroon/20', label: 'Not Eligible' },
  PARTIAL: { icon: AlertCircle, color: 'text-gov-saffron', bg: 'bg-gov-saffron/5', border: 'border-gov-saffron/20', label: 'Partial' },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: 'text-gov-blue', bg: 'bg-gov-blue/5', border: 'border-gov-blue/20', label: 'Insufficient Data' },
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
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

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
          <h1 className="text-xl font-bold text-gov-navy">My Assessments</h1>
        </div>
        <p className="text-gray-500 text-sm ml-3">Track your eligibility checks and review past decisions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gov-navy" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="bg-white border border-gov-border rounded-xl p-10 text-center">
          <Clock size={40} className="mx-auto text-gov-navy/20 mb-3" />
          <p className="text-gov-navy font-medium">No assessments yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Check your eligibility for a scheme to see results here.
          </p>
          <Link
            to="/catalog"
            className="inline-block mt-4 bg-gov-navy text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gov-navy-light transition-colors"
          >
            Browse Schemes
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total Checks', value: stats.total, color: 'border-gov-navy bg-gov-navy/5', text: 'text-gov-navy' },
              { label: 'Eligible', value: stats.eligible, color: 'border-gov-green bg-gov-green/5', text: 'text-gov-green' },
              { label: 'Not Eligible', value: stats.not_eligible, color: 'border-gov-maroon bg-gov-maroon/5', text: 'text-gov-maroon' },
              { label: 'Partial', value: stats.partial, color: 'border-gov-saffron bg-gov-saffron/5', text: 'text-gov-saffron' },
              { label: 'Need More Data', value: stats.insufficient, color: 'border-gov-blue bg-gov-blue/5', text: 'text-gov-blue' },
            ].map((s) => (
              <div key={s.label} className={`border-l-4 ${s.color} rounded-r-lg p-3`}>
                <div className={`text-xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
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
                      <span className="font-medium text-gov-navy text-sm">{a.scheme_name}</span>
                      <span className={`text-xs font-bold ${cfg.color} px-2 py-0.5 rounded-full bg-white/60`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{a.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gov-navy/50">{formatTime(a.timestamp)}</div>
                    <Link
                      to={`/check?doc=${a.document_id}`}
                      className="text-xs text-gov-blue font-medium hover:underline mt-1 inline-block"
                    >
                      Re-check
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
