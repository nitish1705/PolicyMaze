import { CheckCircle, ChevronDown, ChevronUp, FileText, HelpCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReasoningStep } from '../types'

interface Props {
  steps: ReasoningStep[]
}

function formatFieldLabel(label: string): string {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(val: unknown, yes: string, no: string, notProvided: string): string {
  if (val === null || val === undefined) return notProvided
  if (typeof val === 'boolean') return val ? yes : no
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

export default function ReasoningTrace({ steps }: Props) {
  const { t } = useTranslation()
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const yes = t('reasoning.yes')
  const no = t('reasoning.no')
  const notProvided = t('reasoning.notProvided')

  const resultConfig = {
    pass: {
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      label: t('reasoning.met'),
    },
    fail: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      dot: 'bg-red-500',
      label: t('reasoning.notMetLabel'),
    },
    unknown: {
      icon: HelpCircle,
      color: 'text-slate-400 dark:text-slate-500',
      dot: 'bg-slate-400',
      label: t('reasoning.missingInfo'),
    },
  }

  const passed = steps.filter((s) => s.result === 'pass').length
  const failed = steps.filter((s) => s.result === 'fail').length
  const unknown = steps.filter((s) => s.result !== 'pass' && s.result !== 'fail').length

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 bg-gov-navy rounded-full" />
          <h3 className="text-base font-semibold text-gov-navy dark:text-slate-100">{t('reasoning.howWeChecked')}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 ml-3">
          {t('reasoning.subtitle')}
        </p>
      </div>

      {/* Summary counts */}
      <div className="flex gap-4 ml-3">
        {passed > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t('reasoning.criteriaMet', { count: passed })}
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {t('reasoning.notMet', { count: failed })}
          </span>
        )}
        {unknown > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            {t('reasoning.needMoreInfo', { count: unknown })}
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {steps.map((step, idx) => {
          const cfg = resultConfig[step.result as keyof typeof resultConfig] || resultConfig.unknown
          const Icon = cfg.icon
          const isExpanded = expandedStep === step.step
          const label = formatFieldLabel(step.field_label || step.field)

          return (
            <div key={step.step} className={idx !== steps.length - 1 && !isExpanded ? 'border-b border-gray-100 dark:border-slate-700' : ''}>
              <div
                onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
              >
                <Icon size={16} className={cfg.color} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gov-navy dark:text-slate-100 text-sm">{label}</span>
                  {step.is_exception && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">({t('reasoning.exclusionRule')})</span>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700 pt-3 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    {step.explanation}
                  </p>

                  {step.result !== 'unknown' && (
                    <div className="flex items-stretch gap-3">
                      <div className="flex-1 bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">{t('reasoning.required')}</div>
                        <div className="text-sm font-semibold text-gov-navy dark:text-slate-100">
                          {formatValue(step.required_value, yes, no, notProvided)}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-lg font-bold ${step.result === 'pass' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {step.result === 'pass' ? '=' : '≠'}
                        </span>
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">{t('reasoning.yourValue')}</div>
                        <div className="text-sm font-semibold text-gov-navy dark:text-slate-100">
                          {formatValue(step.user_value, yes, no, notProvided)}
                        </div>
                      </div>
                    </div>
                  )}

                  {step.source_text && (
                    <div className="flex items-start gap-2 bg-gray-50 dark:bg-slate-700/60 rounded-lg p-3">
                      <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-0.5">{t('reasoning.sourceFromPolicy')}</div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 italic leading-relaxed">"{step.source_text}"</p>
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
