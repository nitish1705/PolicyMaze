import { AlertCircle, CheckCircle, HelpCircle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EligibilityCheckResponse } from '../types'

interface Props {
  result: EligibilityCheckResponse
}

const verdictConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  ELIGIBLE: { icon: CheckCircle, color: 'text-gov-green', bg: 'bg-gov-green/5 dark:bg-gov-green/10', border: 'border-gov-green/30' },
  NOT_ELIGIBLE: { icon: XCircle, color: 'text-gov-maroon', bg: 'bg-gov-maroon/5 dark:bg-gov-maroon/10', border: 'border-gov-maroon/30' },
  PARTIAL: { icon: AlertCircle, color: 'text-gov-saffron', bg: 'bg-gov-saffron/5 dark:bg-gov-saffron/10', border: 'border-gov-saffron/30' },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: 'text-gov-blue', bg: 'bg-gov-blue/5 dark:bg-gov-blue/10', border: 'border-gov-blue/30' },
}

export default function EligibilityResult({ result }: Props) {
  const { t } = useTranslation()
  const config = verdictConfig[result.overall_verdict] || verdictConfig.INSUFFICIENT_DATA
  const Icon = config.icon

  const verdictLabel = t(`eligibility.verdicts.${result.overall_verdict}`, {
    defaultValue: result.overall_verdict.replace(/_/g, ' '),
  })

  return (
    <div className="space-y-6">
      <div className={`${config.bg} ${config.border} border rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <Icon size={40} className={config.color} />
          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${config.color}`}>
              {verdictLabel}
            </h3>
            <p className="text-gray-700 dark:text-slate-300 mt-1">{result.summary}</p>
            <div className="flex gap-6 mt-4">
              <Stat label={t('eligibility.matched')} value={result.matched_count} color="text-gov-green" />
              <Stat label={t('eligibility.failed')} value={result.failed_count} color="text-gov-maroon" />
              <Stat label={t('eligibility.unknown')} value={result.unknown_count} color="text-gov-saffron" />
              <Stat label={t('eligibility.total')} value={result.total_rules} color="text-gov-navy dark:text-slate-200" />
            </div>
          </div>
        </div>
      </div>

      {result.missing_information.length > 0 && (
        <div className="bg-gov-blue/5 dark:bg-gov-blue/10 border border-gov-blue/30 rounded-xl p-5">
          <h4 className="font-semibold text-gov-blue mb-3">{t('eligibility.missingInformation')}</h4>
          <div className="space-y-2">
            {result.missing_information.map((m) => (
              <div key={m.field} className="flex items-start gap-2 text-sm">
                <HelpCircle size={16} className="text-gov-blue mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-gov-navy dark:text-slate-100">{m.field_label}</span>
                  <span className="text-gray-600 dark:text-slate-400"> &mdash; {m.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.disqualifying_criteria.length > 0 && (
        <div className="bg-gov-maroon/5 dark:bg-gov-maroon/10 border border-gov-maroon/30 rounded-xl p-5">
          <h4 className="font-semibold text-gov-maroon mb-3">{t('eligibility.disqualifyingCriteria')}</h4>
          <div className="space-y-2">
            {result.disqualifying_criteria.map((e) => (
              <div key={e.evidence_id} className="flex items-start gap-2 text-sm">
                <XCircle size={16} className="text-gov-maroon mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-gov-navy dark:text-slate-100">{e.field_label}:</span>{' '}
                  <span className="text-gov-maroon/80">
                    Your value ({String(e.user_value)}) does not meet requirement ({e.operator} {String(e.rule_value)})
                  </span>
                  {e.source.text && (
                    <p className="text-xs text-gov-maroon/60 mt-1 italic">{t('eligibility.sourcePrefix')} "{e.source.text.slice(0, 120)}"</p>
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
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
