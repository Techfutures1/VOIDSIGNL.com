'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

export default function NewThreadPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLang()
  const slug = (params?.categorySlug as string) ?? ''

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (title.trim().length < 5) { setError(t('forums2.error_title_min')); return }
    if (body.trim().length < 10) { setError(t('forums2.error_body_min')); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/forums/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('forums2.error_post_failed'))
      router.push(`/forums/${slug}/${json.data.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('forums2.error_generic')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/forums" className="font-mono text-xs text-text-dim hover:text-text transition-colors">
          {t('forums2.breadcrumb_forums')}
        </Link>
        <span className="text-text-dim/60 font-mono text-xs">→</span>
        <Link href={`/forums/${slug}`} className="font-mono text-xs text-text-dim hover:text-text transition-colors capitalize">
          {slug.replace(/-/g, ' ')}
        </Link>
        <span className="text-text-dim/60 font-mono text-xs">→</span>
        <span className="font-mono text-xs text-text">{t('forums2.new_thread_title')}</span>
      </div>

      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-1">{t('forums2.breadcrumb_forums')}</p>
        <h1 className="font-mono text-2xl font-bold text-text">{t('forums2.new_thread_title')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="font-mono text-xs text-text-dim uppercase tracking-widest block mb-2">
            {t('forums2.label_title')}
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('forums2.placeholder_title')}
            maxLength={200}
            className="w-full bg-void border border-border rounded-xl px-4 py-3 text-text text-sm font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors"
          />
          <p className="font-mono text-[10px] text-text-dim/60 mt-1 text-right">
            {title.length}/200
          </p>
        </div>

        <div>
          <label className="font-mono text-xs text-text-dim uppercase tracking-widest block mb-2">
            {t('forums2.label_body')}
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={t('forums2.placeholder_body')}
            rows={10}
            maxLength={10000}
            className="w-full bg-void border border-border rounded-xl px-4 py-3 text-text text-sm font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors resize-none"
          />
          <p className="font-mono text-[10px] text-text-dim/60 mt-1 text-right">
            {body.length}/10000
          </p>
        </div>

        {error && <p className="font-mono text-xs text-danger">{error}</p>}

        <div className="flex gap-3">
          <Link
            href={`/forums/${slug}`}
            className="flex-1 py-3 border border-border text-text-dim font-mono text-sm uppercase tracking-wider rounded-xl hover:border-purple hover:text-text transition-colors duration-200 text-center"
          >
            {t('forums2.cancel')}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-purple text-white font-mono text-sm uppercase tracking-wider rounded-xl hover:bg-purple/85 transition-colors duration-200 disabled:opacity-40"
          >
            {loading ? t('forums2.posting') : t('forums2.submit_thread')}
          </button>
        </div>
      </form>
    </div>
  )
}
