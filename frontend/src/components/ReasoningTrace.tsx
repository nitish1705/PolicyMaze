import { CheckCircle, ChevronDown, ChevronUp, FileText, HelpCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { ReasoningStep } from '../types'

interface Props {
  steps: ReasoningStep[]
}

const OPERATOR_LABELS: Record<string, string> = {
  greater_than_or_equal: 'at least',
  greater_than: 'more than',
  less_than_or_equal: 'at most',
  less_than: 'less than',
  equals: 'exactly',
  not_equals: 'not',
  in: 'one of',
  not_in: 'not one of',
  between: 'between',
  contains: 'includes',
  not_contains: 'does not include',
  exists: 'provided',
}

function formatOperator(op: string): string {
  return OPERATOR_LABELS[op] || op.replace(/_/g, ' ')
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'not provided'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

function formatFieldLabel(label: string): string {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const resultConfig = {
  pass: {
    icon: CheckCircle,
    color: 'text-gov-green',
    bg: 'bg-gov-green/5',
    border: 'border-gov-green/20',
    label: 'Met',
    labelBg: 'bg-gov-green/10',
  },
  fail: {
    icon: XCircle,
    color: 'text-gov-maroon',
    bg: 'bg-gov-maroon/5',
    border: 'border-gov-maroon/20',
    label: 'Not Met',
    labelBg: 'bg-gov-maroon/10',
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-gov-saffron',
    bg: 'bg-gov-saffron/5',
    border: 'border-gov-saffron/20',
    label: 'Missing Info',
    labelBg: 'bg-gov-saffron/10',
  },
}

function buildSentence(step: ReasoningStep): string {
  const label = formatFieldLabel(step.field_label || step.field)
  const op = formatOperator(step.operator)
  const required = formatValue(step.required_value)
  const yours = formatValue(step.user_value)

  if (step.result === 'unknown') {
    return `Your ${label.toLowerCase()} is not available in your documents. Please upload a document that provides this information.`
  }
  if (step.result === 'pass') {
    return `The scheme requires ${label.toLowerCase()} to be ${op} ${required}. Your value is ${yours}, which meets this requirement.`
  }
  return `The scheme requires ${label.toLowerCase()} to be ${op} ${required}. Your value is ${yours}, which does not meet this requirement.`
}

export default function ReasoningTrace({ steps }: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const passed = steps.filter((s) => s.result === 'pass').length
  const failed = steps.filter((s) => s.result === 'fail').length
  const unknown = steps.filter((s) => s.result !== 'pass' && s.result !== 'fail').length

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 bg-gov-navy rounded-full" />
          <h3 className="text-base font-semibold text-gov-navy">How We Checked</h3>
        </div>
        <p className="text-sm text-gray-500 ml-3">
          Each eligibility rule was verified against your uploaded documents
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 ml-3">
        {passed > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gov-green bg-gov-green/5 border border-gov-green/20 rounded-full px-3 py-1">
            <CheckCircle size={12} /> {passed} criteria met
          </div>
        )}
        {failed > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gov-maroon bg-gov-maroon/5 border border-gov-maroon/20 rounded-full px-3 py-1">
            <XCircle size={12} /> {failed} not met
          </div>
        )}
        {unknown > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gov-saffron bg-gov-saffron/5 border border-gov-saffron/20 rounded-full px-3 py-1">
            <HelpCircle size={12} /> {unknown} need more info
          </div>
        )}
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const cfg = resultConfig[step.result as keyof typeof resultConfig] || resultConfig.unknown
          const Icon = cfg.icon
          const isExpanded = expandedStep === step.step
          const label = formatFieldLabel(step.field_label || step.field)

          return (
            <div key={step.step} className={`${cfg.bg} border ${cfg.border} rounded-xl overflow-hidden`}>
              <div
                onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Icon size={20} className={cfg.color} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gov-navy text-sm">{label}</span>
                  {step.is_exception && (
                    <span className="ml-2 text-xs bg-gov-saffron/10 text-gov-saffron px-1.5 py-0.5 rounded">Exclusion Rule</span>
                  )}
                </div>
                <span className={`text-xs font-semibold ${cfg.color} ${cfg.labelBg} px-2.5 py-1 rounded-full`}>
                  {cfg.label}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-gov-navy/40" /> : <ChevronDown size={16} className="text-gov-navy/40" />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gov-border/30 pt-3 space-y-3">
                  {/* Plain language explanation */}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {buildSentence(step)}
                  </p>

                  {/* Visual comparison */}
                  {step.result !== 'unknown' && (
                    <div className="flex items-stretch gap-3">
                      <div className="flex-1 bg-white rounded-lg border border-gov-border p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-gov-navy/40 mb-1">Required</div>
                        <div className="text-sm font-semibold text-gov-navy">
                          {formatOperator(step.operator)} {formatValue(step.required_value)}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-lg font-bold ${cfg.color}`}>
                          {step.result === 'pass' ? '=' : '≠'}
                        </span>
                      </div>
                      <div className={`flex-1 rounded-lg border p-3 text-center ${step.result === 'pass' ? 'bg-gov-green/5 border-gov-green/20' : 'bg-gov-maroon/5 border-gov-maroon/20'}`}>
                        <div className="text-[10px] uppercase tracking-wider text-gov-navy/40 mb-1">Your Value</div>
                        <div className="text-sm font-semibold text-gov-navy">
                          {formatValue(step.user_value)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Source citation */}
                  {step.source_text && (
                    <div className="flex items-start gap-2 bg-white/60 rounded-lg p-3 border border-gov-border/30">
                      <FileText size={14} className="text-gov-gold mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gov-navy/40 mb-0.5">Source from Policy Document</div>
                        <p className="text-xs text-gray-600 italic leading-relaxed">"{step.source_text}"</p>
                      </div>
                    </div>
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
