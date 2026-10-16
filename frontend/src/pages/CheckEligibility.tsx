import { AlertCircle, ArrowRight, CheckCircle, FolderOpen, Loader2, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  checkEligibility,
  getCitizenProfile,
  getDocumentRules,
  getRequiredDocuments,
  getSchemes,
} from '../api/client'
import EligibilityResult from '../components/EligibilityResult'
import ReasoningTrace from '../components/ReasoningTrace'
import type {
  EligibilityCheckResponse,
  ExtractedRule,
  RequiredDocument,
  SchemeListItem,
} from '../types'

const BASE = import.meta.env.VITE_API_URL || '/api'

export default function CheckEligibility() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [selectedDoc, setSelectedDoc] = useState(searchParams.get('doc') || '')
  const [rules, setRules] = useState<ExtractedRule[]>([])
  const [result, setResult] = useState<EligibilityCheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const [citizenProfile, setCitizenProfile] = useState<Record<string, unknown>>({})
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([])
  const [coveredFields, setCoveredFields] = useState<string[]>([])
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    getSchemes().then((r) => {
      setSchemes(r.schemes)
      if (!selectedDoc && r.schemes.length > 0) {
        setSelectedDoc(r.schemes[0].document_id)
      }
    }).catch(() => {})
    getCitizenProfile()
      .then((r) => setCitizenProfile(r.profile))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDoc) return
    setRules([])
    setResult(null)
    setProfileLoaded(false)
    getDocumentRules(selectedDoc).then((r) => setRules(r.rules)).catch(() => {})
    getRequiredDocuments(selectedDoc).then((r) => {
      setRequiredDocs(r.required)
      setCoveredFields(r.covered_fields)
      setMissingFields(r.missing_fields)
      setCitizenProfile((prev) => ({ ...prev, ...r.profile_coverage }))
      setProfileLoaded(true)
    }).catch(() => setProfileLoaded(true))
  }, [selectedDoc])

  const handleCheck = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setResult(null)
    try {
      const res = await checkEligibility(selectedDoc, citizenProfile, i18n.language)
      setResult(res)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  const missingDocsNeeded = requiredDocs.filter((d) => !d.is_uploaded)
  const allFieldsCovered = missingFields.length === 0
  const totalFields = coveredFields.length + missingFields.length

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gov-navy rounded-full" />
          <h1 className="text-xl font-bold text-gov-navy dark:text-slate-100">{t('nav.checkEligibility')}</h1>
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm ml-3">Select a scheme to automatically verify eligibility using your imported documents</p>
      </div>

      {schemes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center">
          <p className="text-gov-navy dark:text-slate-100 font-medium">No schemes loaded yet.</p>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Browse the catalog to extract rules from a scheme first.</p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gov-navy dark:text-slate-200 mb-1">{t('dashboard.schemeName')}</label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full px-3 py-2.5 border border-gov-border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gov-navy dark:text-slate-100 focus:ring-2 focus:ring-gov-blue focus:border-gov-blue outline-none"
            >
              {schemes.map((s) => (
                <option key={s.document_id} value={s.document_id}>
                  {s.scheme_name} ({s.rule_count} rules)
                </option>
              ))}
            </select>
          </div>

          {profileLoaded && (
            <>
              {rules.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-8 text-center space-y-4">
                  <Shield size={32} className="mx-auto text-gov-navy/30 dark:text-slate-600" />
                  <div>
                    <p className="text-gov-navy dark:text-slate-100 font-semibold">Ready to analyze this scheme</p>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
                      Our AI will read the scheme's eligibility text and extract structured rules so we can check your eligibility.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setExtracting(true)
                      try {
                        const res = await fetch(`${BASE}/catalog/extract-by-document/${selectedDoc}`, { method: 'POST' })
                        const body = await res.json()
                        if (body.document_id) {
                          setSelectedDoc(body.document_id)
                        } else {
                          getDocumentRules(selectedDoc).then((r) => setRules(r.rules)).catch(() => {})
                        }
                      } catch {}
                      finally { setExtracting(false) }
                    }}
                    disabled={extracting}
                    className="inline-flex items-center gap-2 bg-gov-navy text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gov-navy-light disabled:opacity-50 transition-colors"
                  >
                    {extracting ? (
                      <><Loader2 size={16} className="animate-spin" /> Extracting rules with AI...</>
                    ) : (
                      <><Shield size={16} /> Extract Rules & Check Eligibility</>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Profile coverage status */}
                  <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-gov-blue rounded-full" />
                        <h2 className="text-base font-semibold text-gov-navy dark:text-slate-100">Profile Coverage</h2>
                      </div>
                      <div className="text-xs text-gov-navy/60 dark:text-slate-400">
                        {coveredFields.length}/{totalFields} fields available
                      </div>
                    </div>

                    {/* Coverage bar */}
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all bg-gov-navy dark:bg-gov-gold"
                        style={{ width: `${totalFields > 0 ? (coveredFields.length / totalFields) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Covered fields */}
                    {coveredFields.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                          <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" /> Fields from your documents
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {coveredFields.map((f) => (
                            <div key={f} className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5">
                              <CheckCircle size={10} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs text-gov-navy dark:text-slate-200 capitalize">{f.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                {String(citizenProfile[f] ?? '')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing fields */}
                    {missingFields.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                          <AlertCircle size={12} className="text-amber-600 dark:text-amber-400" /> Missing information &mdash; import these documents
                        </div>
                        <div className="space-y-2">
                          {missingDocsNeeded.map((doc) => (
                            <Link
                              key={doc.doc_type}
                              to="/documents"
                              className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 hover:border-gov-navy dark:hover:border-slate-500 transition-colors group"
                            >
                              <FolderOpen size={18} className="text-gray-400 dark:text-slate-500" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gov-navy dark:text-slate-100">{doc.doc_type}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                  Provides: {doc.covers_fields.map((f) => f.replace(/_/g, ' ')).join(', ')}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-gov-navy dark:text-slate-300 text-xs font-medium group-hover:gap-2 transition-all">
                                Import <ArrowRight size={12} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Check button */}
                  <button
                    onClick={handleCheck}
                    disabled={loading || coveredFields.length === 0}
                    className="w-full bg-gov-navy text-white py-3 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> {t('profile.evaluating')}</>
                    ) : (
                      <><Shield size={18} /> {t('profile.checkEligibility')}{!allFieldsCovered && missingFields.length > 0 ? ` (${missingFields.length} fields missing)` : ''}</>
                    )}
                  </button>

                  {!allFieldsCovered && coveredFields.length > 0 && (
                    <p className="text-xs text-gov-navy/50 dark:text-slate-500 text-center -mt-4">
                      You can still check with partial data — missing fields will show as "insufficient data" in the result.
                    </p>
                  )}
                </>
              )}
            </>
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
