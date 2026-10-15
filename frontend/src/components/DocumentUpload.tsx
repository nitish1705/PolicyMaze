import { Upload, FileCheck, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { uploadDocument } from '../api/client'
import type { DocumentUploadResponse } from '../types'

interface Props {
  onUploaded: (res: DocumentUploadResponse) => void
}

export default function DocumentUpload({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [schemeName, setSchemeName] = useState('')
  const [version, setVersion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported')
      return
    }
    setFile(f)
    setError('')
  }, [])

  const handleSubmit = async () => {
    if (!file || !schemeName.trim()) {
      setError('Please select a file and enter a scheme name')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await uploadDocument(file, schemeName.trim(), version.trim() || undefined)
      onUploaded(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
        }}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.pdf'
          input.onchange = () => { if (input.files?.[0]) handleFile(input.files[0]) }
          input.click()
        }}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3 text-green-700">
            <FileCheck size={28} />
            <span className="font-medium">{file.name}</span>
            <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
        ) : (
          <div className="text-gray-500">
            <Upload size={36} className="mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Drop a policy PDF here or click to browse</p>
            <p className="text-sm mt-1">Supports government scheme documents</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scheme Name *</label>
          <input
            type="text"
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
            placeholder="e.g. PM Kisan Samman Nidhi"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g. 2023"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !file || !schemeName.trim()}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Extracting rules with AI...
          </>
        ) : (
          <>
            <Upload size={18} />
            Upload & Extract Rules
          </>
        )}
      </button>
    </div>
  )
}
