import { auth } from '../firebase'
import type {
  CitizenDocument,
  CitizenDocumentsResponse,
  DocumentRulesResponse,
  DocumentUploadResponse,
  EligibilityCheckResponse,
  RecommendationsResponse,
  RequiredDocumentsResponse,
  SchemeListResponse,
} from '../types'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser
  if (user) {
    return user.getIdToken()
  }
  return localStorage.getItem('auth_token')
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = await getAuthToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`${BASE}${url}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || body.detail?.message || body.detail || `Request failed: ${res.status}`)
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
  lang = 'en',
): Promise<EligibilityCheckResponse> {
  return request<EligibilityCheckResponse>('/eligibility/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId, profile, lang }),
  })
}

export async function getSchemes(): Promise<SchemeListResponse> {
  return request<SchemeListResponse>('/schemes')
}

export async function getCitizenDocuments(): Promise<CitizenDocumentsResponse> {
  return request<CitizenDocumentsResponse>('/citizen/documents')
}

export async function uploadCitizenDocument(
  file: File,
  docType: string,
): Promise<CitizenDocument> {
  const form = new FormData()
  form.append('file', file)
  form.append('doc_type', docType)
  return request<CitizenDocument>('/citizen/documents', {
    method: 'POST',
    body: form,
  })
}

export async function deleteCitizenDocument(docId: string): Promise<void> {
  await request(`/citizen/documents/${docId}`, { method: 'DELETE' })
}

export async function getCitizenProfile(): Promise<{ profile: Record<string, unknown> }> {
  return request('/citizen/profile')
}

export async function getRequiredDocuments(documentId: string): Promise<RequiredDocumentsResponse> {
  return request<RequiredDocumentsResponse>(`/citizen/required-documents/${documentId}`)
}

export async function getDocumentTypes(): Promise<{ types: string[] }> {
  return request('/citizen/document-types')
}

export async function getCatalogFilters(): Promise<{ states: string[]; levels: string[]; categories: string[] }> {
  return request('/catalog/filters')
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  return request('/citizen/recommendations')
}

