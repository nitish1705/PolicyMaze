import { CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { ReasoningStep } from '../types'

interface Props {
  steps: ReasoningStep[]
}

const resultConfig = {
  pass: { icon: CheckCircle, color: 'text-gov-green', bg: 'bg-gov-green/5', border: 'border-gov-green/20', label: 'PASS' },
  fail: { icon: XCircle, color: 'text-gov-maroon', bg: 'bg-gov-maroon/5', border: 'border-gov-maroon/20', label: 'FAIL' },
  unknown: { icon: HelpCircle, color: 'text-gov-saffron', bg: 'bg-gov-saffron/5', border: 'border-gov-saffron/20', label: 'UNKNOWN' },
}

export default function ReasoningTrace({ steps }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-gov-navy rounded-full" />
        <h3 className="text-base font-semibold text-gov-navy">Reasoning Trace</h3>
      </div>
      <p className="text-sm text-gray-500 ml-3">Step-by-step evaluation of each policy rule against your profile</p>

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
                <span className="text-xs font-mono text-gov-navy/40 w-6">#{step.step}</span>
                <Icon size={18} className={cfg.color} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gov-navy text-sm">{step.field_label}</span>
                  {step.is_exception && (
                    <span className="ml-2 text-xs bg-gov-saffron/10 text-gov-saffron px-1.5 py-0.5 rounded">EXCLUSION</span>
                  )}
                </div>
                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                {isExpanded ? <ChevronUp size={16} className="text-gov-navy/40" /> : <ChevronDown size={16} className="text-gov-navy/40" />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gov-border/30 pt-3 space-y-2 text-sm">
                  <div className="text-gray-700">{step.explanation}</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gov-navy/50">Operator:</span>{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-gov-border">{step.operator}</code>
                    </div>
                    <div>
                      <span className="text-gov-navy/50">Required:</span>{' '}
                      <span className="font-medium text-gov-navy">{JSON.stringify(step.required_value)}</span>
                    </div>
                    <div>
                      <span className="text-gov-navy/50">Yours:</span>{' '}
                      <span className="font-medium text-gov-navy">{step.user_value === null ? 'Not provided' : JSON.stringify(step.user_value)}</span>
                    </div>
                  </div>
                  {step.source_text && (
                    <blockquote className="border-l-3 border-gov-gold pl-3 text-gray-600 italic bg-white/60 p-2 rounded text-xs">
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
