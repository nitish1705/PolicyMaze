import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getDocumentRules, getSchemes } from '../api/client'
import EligibilityResult from '../components/EligibilityResult'
import ReasoningTrace from '../components/ReasoningTrace'
import UserProfileForm from '../components/UserProfileForm'
import type { EligibilityCheckResponse, ExtractedRule, SchemeListItem } from '../types'

export default function CheckEligibility() {
  const [searchParams] = useSearchParams()
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [selectedDoc, setSelectedDoc] = useState(searchParams.get('doc') || '')
  const [rules, setRules] = useState<ExtractedRule[]>([])
  const [result, setResult] = useState<EligibilityCheckResponse | null>(null)

  useEffect(() => {
    getSchemes().then((r) => {
      setSchemes(r.schemes)
      if (!selectedDoc && r.schemes.length > 0) {
        setSelectedDoc(r.schemes[0].document_id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDoc) return
    setRules([])
    setResult(null)
    getDocumentRules(selectedDoc).then((r) => setRules(r.rules)).catch(() => {})
  }, [selectedDoc])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check Eligibility</h1>
        <p className="text-gray-500 mt-1">Fill your details to check eligibility against a loaded policy scheme</p>
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
                  {s.scheme_name} ({s.rule_count} rules, {s.version || 'no version'})
                </option>
              ))}
            </select>
          </div>

          {rules.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
              <UserProfileForm
                documentId={selectedDoc}
                rules={rules}
                onResult={setResult}
              />
            </div>
          )}

          {result && (
            <>
              <EligibilityResult result={result} />
              <ReasoningTrace steps={result.reasoning_trace} />
            </>
          )}
        </>
      )}
    </div>
  )
}
