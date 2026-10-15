import { FileCheck, FolderOpen, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  deleteCitizenDocument,
  getCitizenDocuments,
  getDocumentTypes,
  uploadCitizenDocument,
} from '../api/client'
import type { CitizenDocument } from '../types'

const DEFAULT_DOC_TYPES = [
  'Aadhaar Card',
  'Income Certificate',
  'Caste Certificate',
  'Domicile Certificate',
  'Age Proof / Birth Certificate',
  'Voter ID',
  'Ration Card (BPL/APL)',
  'Land Records / Patta',
  'Bank Passbook',
  'Education Certificate',
  'Disability Certificate',
  'Marriage Certificate',
  'Employment Proof',
  'Farmer Registration / Kisan Card',
]

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<CitizenDocument[]>([])
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [docTypes, setDocTypes] = useState<string[]>(DEFAULT_DOC_TYPES)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    getCitizenDocuments()
      .then((r) => {
        setDocuments(r.documents)
        setProfile(r.aggregated_profile)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    getDocumentTypes()
      .then((r) => {
        if (r.types && r.types.length > 0) setDocTypes(r.types)
      })
      .catch(() => {})
  }, [])

  const handleUpload = async () => {
    if (!file || !selectedType) {
      setError('Select a document type and file')
      return
    }
    setUploading(true)
    setError('')
    try {
      await uploadCitizenDocument(file, selectedType)
      setFile(null)
      setSelectedType('')
      setShowUpload(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteCitizenDocument(id).catch(() => {})
    load()
  }

  const profileEntries = Object.entries(profile).filter(([, v]) => v !== null && v !== '')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 bg-gov-saffron rounded-full" />
            <h1 className="text-xl font-bold text-gov-navy">My Documents</h1>
          </div>
          <p className="text-gray-500 text-sm ml-3">
            Upload your personal documents (Aadhaar, certificates, etc.) and we'll auto-extract your profile for eligibility checks.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 bg-gov-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gov-navy-light transition-colors"
        >
          <Plus size={16} /> Import Document
        </button>
      </div>

      {showUpload && (
        <div className="bg-white border border-gov-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-gov-gold rounded-full" />
            <h3 className="font-semibold text-gov-navy">Import New Document</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gov-navy mb-1">Document Type *</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gov-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-gov-blue focus:border-gov-blue outline-none"
              >
                <option value="">Select document type...</option>
                {docTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gov-navy mb-1">File *</label>
              <div
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.pdf,.jpg,.jpeg,.png,.txt'
                  input.onchange = () => { if (input.files?.[0]) setFile(input.files[0]) }
                  input.click()
                }}
                className="w-full px-3 py-2 border border-dashed border-gov-border rounded-lg text-sm cursor-pointer hover:border-gov-gold/60 transition-colors flex items-center gap-2"
              >
                {file ? (
                  <><FileCheck size={16} className="text-gov-green" /> {file.name}</>
                ) : (
                  <><Upload size={16} className="text-gray-400" /> <span className="text-gray-500">Click to select file</span></>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-gov-maroon/5 border border-gov-maroon/30 text-gov-maroon rounded-lg px-4 py-2 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !selectedType}
              className="flex items-center gap-2 bg-gov-gold text-gov-navy px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gov-gold/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Extracting with AI...</> : <><Upload size={16} /> Upload & Extract</>}
            </button>
            <button
              onClick={() => { setShowUpload(false); setFile(null); setError('') }}
              className="px-5 py-2 text-sm text-gov-navy/60 hover:text-gov-navy transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Extracted profile summary */}
      {profileEntries.length > 0 && (
        <div className="bg-white border border-gov-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gov-green rounded-full" />
            <h3 className="font-semibold text-gov-navy">Your Extracted Profile</h3>
            <span className="text-xs bg-gov-green/10 text-gov-green px-2 py-0.5 rounded-full ml-2">{profileEntries.length} fields</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {profileEntries.map(([key, val]) => (
              <div key={key} className="bg-gov-cream rounded-lg px-3 py-2">
                <div className="text-xs text-gov-navy/50 capitalize">{key.replace(/_/g, ' ')}</div>
                <div className="text-sm font-medium text-gov-navy mt-0.5">{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded documents list */}
      {documents.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-gov-blue rounded-full" />
            <h2 className="text-base font-semibold text-gov-navy">Uploaded Documents ({documents.length})</h2>
          </div>
          <div className="space-y-2">
            {documents.map((doc) => {
              const fieldCount = Object.keys(doc.extracted_fields).length
              return (
                <div key={doc.id} className="bg-white border border-gov-border rounded-lg p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gov-navy/5 flex items-center justify-center shrink-0">
                    <FolderOpen size={20} className="text-gov-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gov-navy text-sm">{doc.doc_type}</span>
                      <span className="text-xs bg-gov-blue/10 text-gov-blue px-2 py-0.5 rounded">{fieldCount} fields extracted</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{doc.filename}</div>
                    {fieldCount > 0 && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {Object.entries(doc.extracted_fields).slice(0, 5).map(([k, v]) => (
                          <span key={k} className="text-xs bg-gov-cream text-gov-navy/70 px-2 py-0.5 rounded">
                            {k.replace(/_/g, ' ')}: <strong>{String(v)}</strong>
                          </span>
                        ))}
                        {fieldCount > 5 && (
                          <span className="text-xs text-gray-400">+{fieldCount - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gov-maroon/50 hover:text-gov-maroon transition-colors shrink-0"
                    title="Remove document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : !showUpload && (
        <div className="bg-white border border-gov-border rounded-xl p-10 text-center">
          <FolderOpen size={40} className="mx-auto text-gov-navy/20 mb-3" />
          <h3 className="font-semibold text-gov-navy">No documents imported yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Import your personal documents like Aadhaar Card, Income Certificate, Caste Certificate, etc.
            Our AI will automatically extract your details for eligibility checks.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 bg-gov-gold text-gov-navy px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gov-gold/90 transition-colors"
          >
            Import Your First Document
          </button>
        </div>
      )}
    </div>
  )
}
