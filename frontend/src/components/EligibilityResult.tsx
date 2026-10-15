import { CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react'
import type { EligibilityCheckResponse } from '../types'

interface Props {
  result: EligibilityCheckResponse
}

const verdictConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  ELIGIBLE: { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  NOT_ELIGIBLE: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  PARTIAL: { icon: AlertCircle, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  INSUFFICIENT_DATA: { icon: HelpCircle, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
}

export default function EligibilityResult({ result }: Props) {
  const config = verdictConfig[result.overall_verdict] || verdictConfig.INSUFFICIENT_DATA
  const Icon = config.icon

  return (
    <div className="space-y-6">
      <div className={`${config.bg} ${config.border} border rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <Icon size={40} className={config.color} />
          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${config.color}`}>
              {result.overall_verdict.replace(/_/g, ' ')}
            </h3>
            <p className="text-gray-700 mt-1">{result.summary}</p>
            <div className="flex gap-6 mt-4">
              <Stat label="Matched" value={result.matched_count} color="text-green-600" />
              <Stat label="Failed" value={result.failed_count} color="text-red-600" />
              <Stat label="Unknown" value={result.unknown_count} color="text-yellow-600" />
              <Stat label="Total" value={result.total_rules} color="text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {result.missing_information.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="font-semibold text-blue-800 mb-3">Missing Information</h4>
          <div className="space-y-2">
            {result.missing_information.map((m) => (
              <div key={m.field} className="flex items-start gap-2 text-sm">
                <HelpCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-blue-800">{m.field_label}</span>
                  <span className="text-blue-600"> &mdash; {m.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.disqualifying_criteria.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h4 className="font-semibold text-red-800 mb-3">Disqualifying Criteria</h4>
          <div className="space-y-2">
            {result.disqualifying_criteria.map((e) => (
              <div key={e.evidence_id} className="flex items-start gap-2 text-sm">
                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-red-800">{e.field_label}:</span>{' '}
                  <span className="text-red-600">
                    Your value ({String(e.user_value)}) does not meet requirement ({e.operator} {String(e.rule_value)})
                  </span>
                  {e.source.text && (
                    <p className="text-xs text-red-500 mt-1 italic">Source: "{e.source.text.slice(0, 120)}"</p>
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
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
