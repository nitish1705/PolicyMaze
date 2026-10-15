import { useEffect, useState } from 'react'
import { getDocumentRules } from '../api/client'
import DocumentUpload from '../components/DocumentUpload'
import ExtractedRulesTable from '../components/ExtractedRulesTable'
import type { DocumentUploadResponse, ExtractedRule } from '../types'

export default function UploadPage() {
  const [uploaded, setUploaded] = useState<DocumentUploadResponse | null>(null)
  const [rules, setRules] = useState<ExtractedRule[]>([])

  useEffect(() => {
    if (!uploaded) return
    getDocumentRules(uploaded.document_id).then((r) => setRules(r.rules)).catch(() => {})
  }, [uploaded])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Policy Document</h1>
        <p className="text-gray-500 mt-1">Upload a government scheme PDF to extract eligibility rules automatically</p>
      </div>

      <DocumentUpload onUploaded={setUploaded} />

      {uploaded && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h3 className="font-semibold text-green-800">Upload Successful</h3>
          <div className="text-sm text-green-700 mt-2 grid grid-cols-3 gap-3">
            <div>Document ID: <code className="bg-green-100 px-1.5 rounded">{uploaded.document_id}</code></div>
            <div>Pages: {uploaded.page_count}</div>
            <div>Rules extracted: <strong>{uploaded.extracted_rules_count}</strong></div>
          </div>
        </div>
      )}

      {rules.length > 0 && uploaded && (
        <ExtractedRulesTable
          rules={rules}
          schemeName={uploaded.scheme_name}
          confidence={uploaded.extraction_confidence}
        />
      )}
    </div>
  )
}
