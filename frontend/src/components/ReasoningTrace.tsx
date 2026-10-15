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
      color: 'text-gov-green',
      bg: 'bg-gov-green/5 dark:bg-gov-green/10',
      border: 'border-gov-green/20',
      label: t('reasoning.met'),
      labelBg: 'bg-gov-green/10 dark:bg-gov-green/20',
    },
    fail: {
      icon: XCircle,
      color: 'text-gov-maroon',
      bg: 'bg-gov-maroon/5 dark:bg-gov-maroon/10',
      border: 'border-gov-maroon/20',
      label: t('reasoning.notMetLabel'),
      labelBg: 'bg-gov-maroon/10 dark:bg-gov-maroon/20',
    },
    unknown: {
      icon: HelpCircle,
      color: 'text-gov-saffron',
      bg: 'bg-gov-saffron/5 dark:bg-gov-saffron/10',
      border: 'border-gov-saffron/20',
      label: t('reasoning.missingInfo'),
      labelBg: 'bg-gov-saffron/10 dark:bg-gov-saffron/20',
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

      {/* Summary bar */}
      <div className="flex gap-3 ml-3">
        {passed > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gov-green bg-gov-green/5 border border-gov-green/20 rounded-full px-3 py-1">
            <CheckCircle size={12} /> {t('reasoning.criteriaMet', { count: passed })}
          </div>
        )}
        {failed > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gov-maroon bg-gov-maroon/5 border border-gov-maroon/20 rounded-full px-3 py-1">
            <XCircle size={12} /> {t('reasoning.notMet', { count: failed })}
          </div>
        )}
        {unknown > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gov-saffron bg-gov-saffron/5 border border-gov-saffron/20 rounded-full px-3 py-1">
            <HelpCircle size={12} /> {t('reasoning.needMoreInfo', { count: unknown })}
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
                  <span className="font-medium text-gov-navy dark:text-slate-100 text-sm">{label}</span>
                  {step.is_exception && (
                    <span className="ml-2 text-xs bg-gov-saffron/10 text-gov-saffron px-1.5 py-0.5 rounded">{t('reasoning.exclusionRule')}</span>
                  )}
                </div>
                <span className={`text-xs font-semibold ${cfg.color} ${cfg.labelBg} px-2.5 py-1 rounded-full`}>
                  {cfg.label}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-gov-navy/40 dark:text-slate-500" /> : <ChevronDown size={16} className="text-gov-navy/40 dark:text-slate-500" />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gov-border/30 dark:border-slate-700/50 pt-3 space-y-3">
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    {step.explanation}
                  </p>

                  {step.result !== 'unknown' && (
                    <div className="flex items-stretch gap-3">
                      <div className="flex-1 bg-white dark:bg-slate-700 rounded-lg border border-gov-border dark:border-slate-600 p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wider text-gov-navy/40 dark:text-slate-500 mb-1">{t('reasoning.required')}</div>
                        <div className="text-sm font-semibold text-gov-navy dark:text-slate-100">
                          {formatValue(step.required_value, yes, no, notProvided)}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-lg font-bold ${cfg.color}`}>
                          {step.result === 'pass' ? '=' : '≠'}
                        </span>
                      </div>
                      <div className={`flex-1 rounded-lg border p-3 text-center ${step.result === 'pass' ? 'bg-gov-green/5 dark:bg-gov-green/10 border-gov-green/20' : 'bg-gov-maroon/5 dark:bg-gov-maroon/10 border-gov-maroon/20'}`}>
                        <div className="text-[10px] uppercase tracking-wider text-gov-navy/40 dark:text-slate-500 mb-1">{t('reasoning.yourValue')}</div>
                        <div className="text-sm font-semibold text-gov-navy dark:text-slate-100">
                          {formatValue(step.user_value, yes, no, notProvided)}
                        </div>
                      </div>
                    </div>
                  )}

                  {step.source_text && (
                    <div className="flex items-start gap-2 bg-white/60 dark:bg-slate-700/60 rounded-lg p-3 border border-gov-border/30 dark:border-slate-600/50">
                      <FileText size={14} className="text-gov-gold mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-gov-navy/40 dark:text-slate-500 mb-0.5">{t('reasoning.sourceFromPolicy')}</div>
                        <p className="text-xs text-gray-600 dark:text-slate-400 italic leading-relaxed">"{step.source_text}"</p>
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
