import { Loader2, Shield } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { checkEligibility } from '../api/client'
import type { EligibilityCheckResponse, ExtractedRule } from '../types'

interface Props {
  documentId: string
  rules: ExtractedRule[]
  onResult: (res: EligibilityCheckResponse) => void
}

interface FieldDef {
  field: string
  label: string
  type: 'number' | 'text' | 'boolean' | 'select'
  options?: string[]
}

function deriveFields(rules: ExtractedRule[]): FieldDef[] {
  const seen = new Set<string>()
  const fields: FieldDef[] = []

  for (const rule of rules) {
    if (seen.has(rule.field)) continue
    seen.add(rule.field)

    let type: FieldDef['type'] = 'text'
    let options: string[] | undefined

    if (rule.value_type === 'number' || rule.value_type === 'range') {
      type = 'number'
    } else if (rule.value_type === 'boolean') {
      type = 'boolean'
    } else if (rule.value_type === 'list' && Array.isArray(rule.value)) {
      type = 'select'
      options = rule.value.map(String)
    }

    fields.push({
      field: rule.field,
      label: rule.field_label || rule.field.replace(/_/g, ' '),
      type,
      options,
    })
  }
  return fields
}

const inputCls = "w-full px-3 py-2 border border-gov-border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gov-navy dark:text-slate-100 focus:ring-2 focus:ring-gov-blue focus:border-gov-blue outline-none"

export default function UserProfileForm({ documentId, rules, onResult }: Props) {
  const { t, i18n } = useTranslation()
  const fields = deriveFields(rules)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [field]: val }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const profile: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(values)) {
        if (v !== '' && v !== undefined) profile[k] = v
      }
      const res = await checkEligibility(documentId, profile, i18n.language)
      onResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.checkEligibility'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.field}>
            <label className="block text-sm font-medium text-gov-navy dark:text-slate-200 mb-1 capitalize">
              {f.label}
            </label>
            {f.type === 'boolean' ? (
              <select
                value={values[f.field] === undefined ? '' : String(values[f.field])}
                onChange={(e) => {
                  const v = e.target.value
                  set(f.field, v === '' ? undefined : v === 'true')
                }}
                className={inputCls}
              >
                <option value="">{t('profile.notProvided')}</option>
                <option value="true">{t('reasoning.yes')}</option>
                <option value="false">{t('reasoning.no')}</option>
              </select>
            ) : f.type === 'select' && f.options ? (
              <select
                value={String(values[f.field] ?? '')}
                onChange={(e) => set(f.field, e.target.value || undefined)}
                className={inputCls}
              >
                <option value="">{t('profile.notProvided')}</option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : f.type === 'number' ? (
              <input
                type="number"
                value={values[f.field] === undefined ? '' : String(values[f.field])}
                onChange={(e) => set(f.field, e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder={t('profile.enterValue', { label: f.label.toLowerCase() })}
                className={inputCls}
              />
            ) : (
              <input
                type="text"
                value={String(values[f.field] ?? '')}
                onChange={(e) => set(f.field, e.target.value || undefined)}
                placeholder={t('profile.enterValue', { label: f.label.toLowerCase() })}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-gov-maroon/5 border border-gov-maroon/30 text-gov-maroon rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-gov-navy text-white py-3 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t('profile.evaluating')}
          </>
        ) : (
          <>
            <Shield size={18} />
            {t('profile.checkEligibility')}
          </>
        )}
      </button>
    </div>
  )
}
