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
        <h1 className="text-2xl font-bold text-gray-900">Extracted Rules</h1>
        <p className="text-gray-500 mt-1">Browse rules extracted from policy documents with source citations</p>
      </div>

      {schemes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700 font-medium">No schemes loaded yet.</p>
          <p className="text-yellow-600 text-sm mt-1">Upload a policy PDF first from the Upload page.</p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Scheme</label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
