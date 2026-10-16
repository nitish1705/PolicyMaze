import { AlertCircle, CheckCircle, HelpCircle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EligibilityCheckResponse } from '../types'

interface Props {
  result: EligibilityCheckResponse
}

const verdictConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string; dot: string }> = {
  ELIGIBLE: { icon: CheckCircle, color: 'text-emerald-700 dark:text-emerald-400', label: 'Eligible', dot: 'bg-emerald-500' },
  NOT_ELIGIBLE: { icon: XCircle, color: 'text-red-700 dark:text-red-400', label: 'Not Eligible', dot: 'bg-red-500' },
  PARTIAL: { icon: AlertCircle, color: 'text-amber-700 dark:text-amber-400', label: 'Partial Match', dot: 'bg-amber-500' },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: 'text-slate-500 dark:text-slate-400', label: 'Need More Data', dot: 'bg-slate-400' },
}

export default function EligibilityResult({ result }: Props) {
  const { t } = useTranslation()
  const config = verdictConfig[result.overall_verdict] || verdictConfig.INSUFFICIENT_DATA
  const Icon = config.icon

  const verdictLabel = t(`eligibility.verdicts.${result.overall_verdict}`, {
    defaultValue: result.overall_verdict.replace(/_/g, ' '),
  })

  return (
    <div className="space-y-4">
      {/* Main verdict */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <Icon size={20} className={config.color} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gov-navy dark:text-slate-100">
                {verdictLabel}
              </h3>
              <span className={`w-2 h-2 rounded-full ${config.dot}`} />
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{result.summary}</p>
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <Stat label={t('eligibility.matched')} value={result.matched_count} color="text-emerald-700 dark:text-emerald-400" />
              <Stat label={t('eligibility.failed')} value={result.failed_count} color="text-red-700 dark:text-red-400" />
              <Stat label={t('eligibility.unknown')} value={result.unknown_count} color="text-amber-700 dark:text-amber-400" />
              <Stat label={t('eligibility.total')} value={result.total_rules} color="text-gov-navy dark:text-slate-200" />
            </div>
          </div>
        </div>
      </div>

      {result.missing_information.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="font-semibold text-gov-navy dark:text-slate-100 mb-3 text-sm">{t('eligibility.missingInformation')}</h4>
          <div className="space-y-2">
            {result.missing_information.map((m) => (
              <div key={m.field} className="flex items-start gap-2 text-sm">
                <HelpCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-gov-navy dark:text-slate-100">{m.field_label}</span>
                  <span className="text-gray-500 dark:text-slate-400"> &mdash; {m.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.disqualifying_criteria.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
          <h4 className="font-semibold text-gov-navy dark:text-slate-100 mb-3 text-sm">{t('eligibility.disqualifyingCriteria')}</h4>
          <div className="space-y-2">
            {result.disqualifying_criteria.map((e) => (
              <div key={e.evidence_id} className="flex items-start gap-2 text-sm">
                <XCircle size={14} className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-gov-navy dark:text-slate-100">{e.field_label}:</span>{' '}
                  <span className="text-gray-600 dark:text-slate-400">
                    Your value ({String(e.user_value)}) does not meet requirement ({e.operator} {String(e.rule_value)})
                  </span>
                  {e.source.text && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">{t('eligibility.sourcePrefix')} "{e.source.text.slice(0, 120)}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
