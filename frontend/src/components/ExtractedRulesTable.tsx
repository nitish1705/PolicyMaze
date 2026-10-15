import { ChevronDown, ChevronUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { ExtractedRule } from '../types'

interface Props {
  rules: ExtractedRule[]
  schemeName: string
  confidence: number | null
}

export default function ExtractedRulesTable({ rules, schemeName, confidence }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const mandatory = rules.filter((r) => r.is_mandatory && !r.is_exception)
  const exceptions = rules.filter((r) => r.is_exception)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-gov-gold rounded-full" />
          <h3 className="text-base font-semibold text-gov-navy">
            {schemeName} &mdash; {rules.length} Rules
          </h3>
        </div>
        {confidence && (
          <span className="inline-flex items-center gap-1 bg-gov-green/10 text-gov-green px-3 py-1 rounded-full text-sm font-medium">
            <ShieldCheck size={14} />
            {(confidence * 100).toFixed(1)}% confidence
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gov-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gov-navy/5 border-b border-gov-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Field</th>
              <th className="text-left px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Operator</th>
              <th className="text-left px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Value</th>
              <th className="text-left px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Type</th>
              <th className="text-center px-4 py-3 font-semibold text-gov-navy text-xs uppercase tracking-wider">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {mandatory.map((rule) => (
              <RuleRow
                key={rule.rule_id}
                rule={rule}
                expanded={expanded === rule.rule_id}
                onToggle={() => setExpanded(expanded === rule.rule_id ? null : rule.rule_id)}
              />
            ))}
            {exceptions.length > 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-2 bg-gov-saffron/10 text-gov-saffron font-medium text-xs uppercase tracking-wide">
                  <AlertTriangle size={12} className="inline mr-1" />
                  Exclusion Criteria
                </td>
              </tr>
            )}
            {exceptions.map((rule) => (
              <RuleRow
                key={rule.rule_id}
                rule={rule}
                expanded={expanded === rule.rule_id}
                onToggle={() => setExpanded(expanded === rule.rule_id ? null : rule.rule_id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  expanded,
  onToggle,
}: {
  rule: ExtractedRule
  expanded: boolean
  onToggle: () => void
}) {
  const displayValue = typeof rule.value === 'object' ? JSON.stringify(rule.value) : String(rule.value)

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-100 hover:bg-gov-gold/5 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3 font-medium text-gov-navy">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {rule.field_label || rule.field}
          </div>
        </td>
        <td className="px-4 py-3">
          <code className="bg-gov-navy/5 px-2 py-0.5 rounded text-xs text-gov-navy">{rule.operator}</code>
        </td>
        <td className="px-4 py-3 text-gray-700 max-w-48 truncate">{displayValue}</td>
        <td className="px-4 py-3">
          <span className="text-xs bg-gov-blue/10 text-gov-blue px-2 py-0.5 rounded">{rule.value_type}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`text-xs font-medium ${rule.confidence >= 0.9 ? 'text-gov-green' : rule.confidence >= 0.7 ? 'text-gov-saffron' : 'text-gov-maroon'}`}>
            {(rule.confidence * 100).toFixed(0)}%
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gov-cream">
          <td colSpan={5} className="px-6 py-4">
            <div className="space-y-2 text-sm">
              {rule.source_section && (
                <div><span className="font-medium text-gov-navy/70">Section:</span> {rule.source_section}</div>
              )}
              <div>
                <span className="font-medium text-gov-navy/70">Source Text:</span>
                <blockquote className="mt-1 border-l-3 border-gov-gold pl-3 text-gray-700 italic bg-white p-2 rounded">
                  "{rule.source_text}"
                </blockquote>
              </div>
              {rule.amendment_reference && (
                <div>
                  <span className="font-medium text-gov-navy/70">Amendment:</span>{' '}
                  <span className="text-gov-saffron">{rule.amendment_reference}</span>
                </div>
              )}
              {rule.notes && (
                <div><span className="font-medium text-gov-navy/70">Notes:</span> {rule.notes}</div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
