'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { BrandSelect } from '@/components/ui/BrandSelect'
import { createClient } from '@/lib/supabase-browser'
import { useLang } from '@/lib/lang-context'

interface Game {
  id: string
  name: string
}

interface ClipUploadModalProps {
  games: Game[]
  onClose: () => void
  onSuccess: () => void
}

type UploadMode = 'link' | 'upload'

const MAX_SIZE = 100 * 1024 * 1024
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export default function ClipUploadModal({ games, onClose, onSuccess }: ClipUploadModalProps) {
  const { t } = useLang()
  const supabase = createClient()
  const [mode, setMode] = useState<UploadMode>('link')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [gameId, setGameId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function detectSourceType(url: string): 'youtube' | 'twitch' | 'upload' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
    if (url.includes('twitch.tv')) return 'twitch'
    return 'upload'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError(t('clipsUi.errorTitleRequired')); return }

    setUploading(true)
    try {
      let finalUrl = videoUrl.trim()
      let sourceType: 'upload' | 'youtube' | 'twitch' = detectSourceType(finalUrl)

      if (mode === 'upload') {
        if (!file) { setError(t('clipsUi.errorFileRequired')); setUploading(false); return }
        if (file.size > MAX_SIZE) {
          setError(t('clipsUi.errorFileTooLarge')); setUploading(false); return
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(t('clipsUi.errorFileType')); setUploading(false); return
        }

        // Direct vanuit de browser naar Supabase Storage uploaden.
        // Bewust NIET via een Next-route: Vercel-functions cappen de body op 4.5MB,
        // waardoor echte video's anders falen.
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError(t('clipsUi.errorSessionExpired')); setUploading(false); return
        }

        setProgress(15)
        const ext = file.name.split('.').pop() ?? 'mp4'
        const path = `${user.id}/${Date.now()}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('clips-videos')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) throw new Error(t('clipsUi.errorUploadFailed'))

        const { data: { publicUrl } } = supabase.storage
          .from('clips-videos')
          .getPublicUrl(path)

        finalUrl = publicUrl
        sourceType = 'upload'
        setProgress(70)
      }

      if (!finalUrl) { setError(t('clipsUi.errorLinkOrFileRequired')); setUploading(false); return }

      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          video_url: finalUrl,
          game_id: gameId || undefined,
          source_type: sourceType,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('clipsUi.errorCreateFailed'))

      setProgress(100)
      onSuccess()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('clipsUi.errorGeneric')
      setError(msg)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-void/95" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-surface border border-border rounded-2xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-0.5">{t('clipsUi.eyebrow')}</p>
            <h2 className="font-mono text-lg font-bold text-text">{t('clipsUi.addClipTitle')}</h2>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-1 bg-void border border-border rounded-lg p-1">
            {(['link', 'upload'] as UploadMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-colors duration-200 ${
                  mode === m ? 'bg-purple text-white' : 'text-text-dim hover:text-text'
                }`}
              >
                {m === 'link' ? t('clipsUi.modeLink') : t('clipsUi.modeUpload')}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('clipsUi.titlePlaceholder')}
            maxLength={100}
            required
            className="w-full bg-void border border-border rounded-lg px-4 py-3 text-text text-sm font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors"
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('clipsUi.descriptionPlaceholder')}
            maxLength={500}
            rows={2}
            className="w-full bg-void border border-border rounded-lg px-4 py-3 text-text text-sm font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors resize-none"
          />

          {mode === 'link' ? (
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder={t('clipsUi.linkPlaceholder')}
              className="w-full bg-void border border-border rounded-lg px-4 py-3 text-text text-sm font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors"
            />
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-border rounded-lg font-mono text-xs text-text-dim hover:border-purple hover:text-text transition-colors duration-200"
              >
                {file ? file.name : t('clipsUi.fileSelectPrompt')}
              </button>
            </div>
          )}

          <BrandSelect
            value={gameId}
            onChange={setGameId}
            searchable
            placeholder={t('clipsUi.gameSelectPlaceholder')}
            options={[
              { value: '', label: t('clipsUi.gameSelectPlaceholder') },
              ...games.map(g => ({ value: g.id, label: g.name })),
            ]}
          />

          {uploading && progress > 0 && (
            <div className="w-full h-1.5 bg-void rounded-full overflow-hidden">
              <div className="h-full bg-purple rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          {error && <p className="font-mono text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 bg-purple text-white font-mono text-sm uppercase tracking-wider rounded-lg hover:bg-purple/85 transition-colors duration-200 disabled:opacity-40"
          >
            {uploading ? t('clipsUi.submitting') : t('clipsUi.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
