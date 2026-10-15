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
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-maroon rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy">Upload Policy Document</h1>
        </div>
        <p className="text-gray-500 text-sm ml-3">Upload a government scheme PDF to extract eligibility rules automatically</p>
      </div>

      <DocumentUpload onUploaded={setUploaded} />

      {uploaded && (
        <div className="bg-gov-green/5 border border-gov-green/30 rounded-xl p-5">
          <h3 className="font-semibold text-gov-green">Upload Successful</h3>
          <div className="text-sm text-gov-green/80 mt-2 grid grid-cols-3 gap-3">
            <div>Document ID: <code className="bg-gov-green/10 px-1.5 rounded">{uploaded.document_id}</code></div>
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
