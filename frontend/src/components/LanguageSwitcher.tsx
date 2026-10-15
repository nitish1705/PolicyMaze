import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('lang', code)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe size={14} className="text-gov-gold-light shrink-0" />
      <select
        value={i18n.language}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-gov-gold-light text-xs border-none outline-none cursor-pointer hover:text-white"
      >
        {LANGS.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-gov-navy text-white">
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
