import { useEffect, useState } from 'react'
import { getDocumentRules, getSchemes } from '../api/client'
import ExtractedRulesTable from '../components/ExtractedRulesTable'
import type { ExtractedRule, SchemeListItem } from '../types'

export default function RulesPage() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [rules, setRules] = useState<ExtractedRule[]>([])
  const [schemeName, setSchemeName] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)

  useEffect(() => {
    getSchemes().then((r) => {
      setSchemes(r.schemes)
      if (r.schemes.length > 0) setSelectedDoc(r.schemes[0].document_id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDoc) return
    getDocumentRules(selectedDoc).then((r) => {
      setRules(r.rules)
      setSchemeName(r.scheme_name)
      setConfidence(r.extraction_confidence)
    }).catch(() => {})
  }, [selectedDoc])

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-blue rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy">Extracted Rules</h1>
        </div>
        <p className="text-gray-500 text-sm ml-3">Browse rules extracted from policy documents with source citations</p>
      </div>

      {schemes.length === 0 ? (
        <div className="bg-gov-gold/10 border border-gov-gold/30 rounded-xl p-6 text-center">
          <p className="text-gov-navy font-medium">No schemes loaded yet.</p>
          <p className="text-gov-navy/60 text-sm mt-1">Upload a policy PDF first from the Upload page.</p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gov-navy mb-1">Select Scheme</label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full px-3 py-2.5 border border-gov-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-gov-blue focus:border-gov-blue outline-none"
            >
              {schemes.map((s) => (
                <option key={s.document_id} value={s.document_id}>
                  {s.scheme_name} ({s.rule_count} rules)
                </option>
              ))}
            </select>
          </div>

          {rules.length > 0 && (
            <ExtractedRulesTable rules={rules} schemeName={schemeName} confidence={confidence} />
          )}
        </>
      )}
    </div>
  )
}
