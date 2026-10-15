import { ArrowRight, BookOpen, FolderOpen, GitCompare, Landmark, MapPin, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getSchemes } from '../api/client'
import type { SchemeListItem } from '../types'

interface CatalogStats {
  total: number
  central: number
  state: number
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [schemes, setSchemes] = useState<SchemeListItem[]>([])
  const [catalogStats, setCatalogStats] = useState<CatalogStats | null>(null)

  useEffect(() => {
    getSchemes().then((r) => setSchemes(r.schemes)).catch(() => {})
    const base = import.meta.env.VITE_API_URL || '/api'
    fetch(`${base}/catalog?per_page=1`)
      .then((r) => r.json())
      .then((data) => setCatalogStats({ total: data.total, central: 0, state: 0 }))
      .catch(() => {})
    fetch(`${base}/catalog?per_page=1&level=Central`)
      .then((r) => r.json())
      .then((data) => setCatalogStats((prev) => prev ? { ...prev, central: data.total } : null))
      .catch(() => {})
    fetch(`${base}/catalog?per_page=1&level=State`)
      .then((r) => r.json())
      .then((data) => setCatalogStats((prev) => prev ? { ...prev, state: data.total } : null))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-gov-navy to-gov-navy-light rounded-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gov-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-gov-gold text-xs font-semibold tracking-wider uppercase mb-3">
            <Shield size={14} />
            {t('dashboard.heroLabel')}
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            {t('dashboard.heroTitle')}<br />
            <span className="text-gov-gold">{t('dashboard.heroTitle2')}</span>
          </h1>
          <p className="text-gray-300 mt-3 max-w-xl text-sm leading-relaxed">
            {t('dashboard.heroDesc', { count: catalogStats ? catalogStats.total.toLocaleString() : '2,000+' })}
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              to="/catalog"
              className="bg-gov-gold text-gov-navy px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gov-gold/90 transition-colors"
            >
              {t('dashboard.browseSchemes')}
            </Link>
            <Link
              to="/check"
              className="border border-gov-gold/40 text-gov-gold px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              {t('dashboard.checkEligibility')}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {catalogStats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t('dashboard.totalSchemes'), value: catalogStats.total.toLocaleString(), icon: BookOpen, accent: 'border-gov-saffron bg-gov-saffron/5 dark:bg-gov-saffron/10' },
            { label: t('dashboard.centralSchemes'), value: catalogStats.central.toLocaleString(), icon: Landmark, accent: 'border-gov-green bg-gov-green/5 dark:bg-gov-green/10' },
            { label: t('dashboard.stateSchemes'), value: catalogStats.state.toLocaleString(), icon: MapPin, accent: 'border-gov-blue bg-gov-blue/5 dark:bg-gov-blue/10' },
          ].map((s) => (
            <div key={s.label} className={`border-l-4 ${s.accent} bg-white dark:bg-slate-800 rounded-r-lg p-4 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gov-navy dark:text-slate-100">{s.value}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</div>
                </div>
                <s.icon size={24} className="text-gray-300 dark:text-slate-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Services grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gov-gold rounded-full" />
          <h2 className="text-lg font-bold text-gov-navy dark:text-slate-100">{t('dashboard.citizenServices')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceCard icon={BookOpen} title={t('dashboard.schemeCatalogTitle')} desc={t('dashboard.schemeCatalogDesc')} to="/catalog" accessLabel={t('dashboard.accessService')} />
          <ServiceCard icon={Shield} title={t('dashboard.eligibilityCheckTitle')} desc={t('dashboard.eligibilityCheckDesc')} to="/check" accessLabel={t('dashboard.accessService')} />
          <ServiceCard icon={GitCompare} title={t('dashboard.compareSchemesTitle')} desc={t('dashboard.compareSchemesDesc')} to="/compare" accessLabel={t('dashboard.accessService')} />
          <ServiceCard icon={FolderOpen} title={t('dashboard.myDocumentsTitle')} desc={t('dashboard.myDocumentsDesc')} to="/documents" accessLabel={t('dashboard.accessService')} />
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gov-border dark:border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-gov-green rounded-full" />
          <h2 className="text-lg font-bold text-gov-navy dark:text-slate-100">{t('dashboard.howItWorks')}</h2>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {[
            { step: '01', title: t('dashboard.step01Title'), desc: t('dashboard.step01Desc') },
            { step: '02', title: t('dashboard.step02Title'), desc: t('dashboard.step02Desc') },
            { step: '03', title: t('dashboard.step03Title'), desc: t('dashboard.step03Desc') },
            { step: '04', title: t('dashboard.step04Title'), desc: t('dashboard.step04Desc') },
          ].map((s, i) => (
            <div key={s.step} className="relative">
              {i < 3 && <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-0.5 bg-gov-gold/20" />}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gov-navy text-gov-gold flex items-center justify-center mx-auto mb-3 text-sm font-bold border-2 border-gov-gold/30">
                  {s.step}
                </div>
                <div className="font-semibold text-gov-navy dark:text-slate-100 text-sm">{s.title}</div>
                <div className="text-gray-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available schemes table */}
      {schemes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gov-saffron rounded-full" />
              <h2 className="text-lg font-bold text-gov-navy dark:text-slate-100">{t('dashboard.readyForCheck')}</h2>
            </div>
            <Link to="/catalog" className="text-gov-blue text-sm font-medium flex items-center gap-1 hover:underline">
              {t('dashboard.viewAll')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gov-border dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gov-navy/5 dark:bg-white/5 border-b border-gov-border dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-gov-navy dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.schemeName')}</th>
                  <th className="text-center px-4 py-3 font-semibold text-gov-navy dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.rules')}</th>
                  <th className="text-center px-4 py-3 font-semibold text-gov-navy dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.confidence')}</th>
                  <th className="text-right px-4 py-3 font-semibold text-gov-navy dark:text-slate-300 text-xs uppercase tracking-wider">{t('dashboard.action')}</th>
                </tr>
              </thead>
              <tbody>
                {schemes.slice(0, 10).map((s) => (
                  <tr key={s.document_id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gov-gold/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-gov-navy dark:text-slate-100">{s.scheme_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-gov-blue/10 text-gov-blue px-2 py-0.5 rounded text-xs font-medium">{s.rule_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.extraction_confidence ? (
                        <span className={`text-xs font-medium ${s.extraction_confidence >= 0.9 ? 'text-gov-green' : 'text-gov-saffron'}`}>
                          {(s.extraction_confidence * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 text-xs">{t('common.na')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/check?doc=${s.document_id}`}
                        className="inline-flex items-center gap-1 text-gov-blue hover:text-gov-navy dark:hover:text-slate-100 text-xs font-medium"
                      >
                        {t('dashboard.checkEligibilityLink')} <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceCard({
  icon: Icon,
  title,
  desc,
  to,
  accessLabel,
}: {
  icon: typeof BookOpen
  title: string
  desc: string
  to: string
  accessLabel: string
}) {
  return (
    <Link
      to={to}
      className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-5 hover:shadow-md hover:border-gov-gold/50 dark:hover:border-gov-gold/50 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-gov-navy/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-gov-gold/10 transition-colors">
        <Icon size={20} className="text-gov-navy dark:text-slate-300" />
      </div>
      <h3 className="font-semibold text-gov-navy dark:text-slate-100 mt-3 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
      <div className="flex items-center gap-1 text-gov-gold text-xs font-medium mt-3 group-hover:gap-2 transition-all">
        {accessLabel} <ArrowRight size={12} />
      </div>
    </Link>
  )
}
