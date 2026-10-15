import { CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { ReasoningStep } from '../types'

interface Props {
  steps: ReasoningStep[]
}

const resultConfig = {
  pass: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'PASS' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'FAIL' },
  unknown: { icon: HelpCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'UNKNOWN' },
}

export default function ReasoningTrace({ steps }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Reasoning Trace</h3>
      <p className="text-sm text-gray-500">Step-by-step evaluation of each policy rule against your profile</p>

      <div className="space-y-2">
        {steps.map((step) => {
          const cfg = resultConfig[step.result as keyof typeof resultConfig] || resultConfig.unknown
          const Icon = cfg.icon
          const isExpanded = expandedStep === step.step

          return (
            <div key={step.step} className={`${cfg.bg} border ${cfg.border} rounded-lg overflow-hidden`}>
              <div
                onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-xs font-mono text-gray-400 w-6">#{step.step}</span>
                <Icon size={18} className={cfg.color} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 text-sm">{step.field_label}</span>
                  {step.is_exception && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">EXCLUSION</span>
                  )}
                </div>
                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200/50 pt-3 space-y-2 text-sm">
                  <div className="text-gray-700">{step.explanation}</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Operator:</span>{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded">{step.operator}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">Required:</span>{' '}
                      <span className="font-medium">{JSON.stringify(step.required_value)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Yours:</span>{' '}
                      <span className="font-medium">{step.user_value === null ? 'Not provided' : JSON.stringify(step.user_value)}</span>
                    </div>
                  </div>
                  {step.source_text && (
                    <blockquote className="border-l-3 border-indigo-400 pl-3 text-gray-600 italic bg-white/60 p-2 rounded text-xs">
                      "{step.source_text}"
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
