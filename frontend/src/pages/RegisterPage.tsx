import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Loader2, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password || !confirmPassword) {
      setError(t('auth.errors.fillAllFields'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.errors.passwordsNoMatch'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.errors.passwordTooShort'))
      return
    }

    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      const token = await cred.user.getIdToken()
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_name', name)
      localStorage.setItem('user_email', email)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.errors.fillAllFields')
      if (msg.includes('email-already-in-use')) {
        setError(t('auth.errors.emailInUse'))
      } else if (msg.includes('weak-password')) {
        setError(t('auth.errors.weakPassword'))
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-3 py-2.5 border border-gov-border dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gov-blue focus:border-gov-blue bg-white dark:bg-slate-700 text-gov-navy dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"

  return (
    <div className="min-h-screen bg-gov-cream dark:bg-slate-900 flex flex-col">
      <div className="flex h-1.5">
        <div className="flex-1 bg-gov-saffron" />
        <div className="flex-1 bg-white dark:bg-slate-200" />
        <div className="flex-1 bg-gov-green" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck size={32} className="text-gov-navy dark:text-gov-gold" />
              <h1 className="text-2xl font-bold text-gov-navy dark:text-slate-100">Policy Maze</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('header.subtitle')}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gov-border dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gov-navy dark:text-slate-100 mb-5">{t('auth.createAccount')}</h2>

            {error && (
              <div className="bg-gov-maroon/5 border border-gov-maroon/20 text-gov-maroon text-sm rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gov-navy/70 dark:text-slate-300 mb-1">{t('auth.fullName')}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.fullNamePlaceholder')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gov-navy/70 dark:text-slate-300 mb-1">{t('auth.email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gov-navy/70 dark:text-slate-300 mb-1">{t('auth.password')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.passwordHint')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gov-navy/70 dark:text-slate-300 mb-1">{t('auth.confirmPassword')}</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('auth.confirmPasswordPlaceholder')} className={inputCls} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gov-navy text-white py-2.5 rounded-lg font-medium hover:bg-gov-navy-light disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-gov-blue font-medium hover:underline">{t('auth.signIn')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
