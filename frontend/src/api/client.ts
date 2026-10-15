import type {
  DocumentRulesResponse,
  DocumentUploadResponse,
  EligibilityCheckResponse,
  SchemeListResponse,
} from '../types'

const BASE = '/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || body.detail?.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function uploadDocument(
  file: File,
  schemeName: string,
  version?: string,
): Promise<DocumentUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('scheme_name', schemeName)
  if (version) form.append('version', version)

  return request<DocumentUploadResponse>('/documents/upload', {
    method: 'POST',
    body: form,
  })
}

export async function getDocumentRules(documentId: string): Promise<DocumentRulesResponse> {
  return request<DocumentRulesResponse>(`/documents/${documentId}/rules`)
}

export async function checkEligibility(
  documentId: string,
  profile: Record<string, unknown>,
): Promise<EligibilityCheckResponse> {
  return request<EligibilityCheckResponse>('/eligibility/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId, profile }),
  })
}

export async function getSchemes(): Promise<SchemeListResponse> {
  return request<SchemeListResponse>('/schemes')
}
