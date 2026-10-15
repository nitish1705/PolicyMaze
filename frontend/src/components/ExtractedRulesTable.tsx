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
        <h3 className="text-lg font-semibold text-gray-900">
          {schemeName} &mdash; {rules.length} Rules
        </h3>
        {confidence && (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            <ShieldCheck size={14} />
            {(confidence * 100).toFixed(1)}% confidence
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Field</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Operator</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Value</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Conf.</th>
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
                <td colSpan={5} className="px-4 py-2 bg-orange-50 text-orange-700 font-medium text-xs uppercase tracking-wide">
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
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3 font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {rule.field_label || rule.field}
          </div>
        </td>
        <td className="px-4 py-3">
          <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{rule.operator}</code>
        </td>
        <td className="px-4 py-3 text-gray-700 max-w-48 truncate">{displayValue}</td>
        <td className="px-4 py-3">
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{rule.value_type}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`text-xs font-medium ${rule.confidence >= 0.9 ? 'text-green-600' : rule.confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
            {(rule.confidence * 100).toFixed(0)}%
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-6 py-4">
            <div className="space-y-2 text-sm">
              {rule.source_section && (
                <div><span className="font-medium text-gray-600">Section:</span> {rule.source_section}</div>
              )}
              <div>
                <span className="font-medium text-gray-600">Source Text:</span>
                <blockquote className="mt-1 border-l-3 border-indigo-400 pl-3 text-gray-700 italic bg-white p-2 rounded">
                  "{rule.source_text}"
                </blockquote>
              </div>
              {rule.amendment_reference && (
                <div>
                  <span className="font-medium text-gray-600">Amendment:</span>{' '}
                  <span className="text-orange-600">{rule.amendment_reference}</span>
                </div>
              )}
              {rule.notes && (
                <div><span className="font-medium text-gray-600">Notes:</span> {rule.notes}</div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
