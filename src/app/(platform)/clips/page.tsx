'use client'

import { useState, useEffect, useCallback } from 'react'
import ClipCard from '@/components/clips/ClipCard'
import ClipUploadModal from '@/components/clips/ClipUploadModal'
import ClipPlayer from '@/components/clips/ClipPlayer'
import type { ClipData } from '@/components/clips/ClipModal'
import { BrandSelect } from '@/components/ui/BrandSelect'
import { useLang } from '@/lib/lang-context'

type SortOption = 'newest' | 'likes' | 'views'

interface Game { id: string; name: string }

const PAGE_SIZE = 20

export default function ClipsPage() {
  const { t } = useLang()
  const [clips, setClips] = useState<ClipData[]>([])
  const [cotw, setCotw] = useState<ClipData | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [gameFilter, setGameFilter] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchClips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        ...(gameFilter ? { game_id: gameFilter } : {}),
      })
      const res = await fetch(`/api/clips?${params}`)
      const json = await res.json()
      setClips(json.data ?? [])
      setCotw(json.cotw ?? null)
      if (json.games) setGames(json.games)
      setTotal(json.pagination?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [sort, page, gameFilter])

  useEffect(() => { fetchClips() }, [fetchClips])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-1">{t('clips.eyebrow')}</p>
          <h1 className="font-mono text-3xl font-bold text-text mb-1">{t('clips.title')}</h1>
          <p className="text-text-dim text-sm">{total > 0 ? `${total.toLocaleString()} ${t('clips.countSuffix')}` : ''}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-5 py-2.5 bg-purple text-white font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-purple/85 transition-colors"
        >
          {t('clips.addShort')}
        </button>
      </div>

      {cotw && (
        <div className="mb-8">
          <p className="font-mono text-[10px] tracking-[0.2em] text-cyan uppercase mb-3">
            ★ {t('clips.clipOfTheWeek')}
          </p>
          <div className="bg-surface border border-cyan/30 rounded-2xl overflow-hidden">
            <div className="p-5">
              <ClipPlayer videoUrl={cotw.video_url} sourceType={cotw.source_type} title={cotw.title} />
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-base font-bold text-text mb-1">{cotw.title}</p>
                  <p className="font-mono text-xs text-text-dim">
                    {cotw.user?.display_name ?? cotw.user?.username}
                    {cotw.game && ` · ${cotw.game.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-cyan font-bold">♥ {cotw.like_count?.toLocaleString()}</p>
                  <p className="font-mono text-[10px] text-text-dim">{cotw.view_count?.toLocaleString()} {t('clips.views')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="min-w-[180px]">
          <BrandSelect
            value={gameFilter}
            onChange={(v) => { setGameFilter(v); setPage(1) }}
            placeholder={t('clips.allGames')}
            options={[
              { value: '', label: t('clips.allGames') },
              ...games.map(g => ({ value: g.id, label: g.name })),
            ]}
          />
        </div>

        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['newest', 'likes', 'views'] as SortOption[]).map(s => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider transition-colors duration-200 ${
                sort === s ? 'bg-purple text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {s === 'newest' ? t('clips.sortNewest') : s === 'likes' ? t('clips.sortLikes') : t('clips.sortViews')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl aspect-video" />
          ))}
        </div>
      ) : clips.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-mono text-[10px] tracking-[0.2em] text-text-dim/60 uppercase mb-3">{t('clips.emptyEyebrow')}</p>
          <p className="text-text-dim text-sm mb-6">{t('clips.emptyMessage')}</p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-5 py-2.5 bg-purple text-white font-mono text-sm rounded-lg hover:bg-purple/85 transition-colors"
          >
            {t('clips.addClip')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map(clip => (<ClipCard key={clip.id} clip={clip} />))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-border text-text-dim font-mono text-xs rounded-lg hover:border-purple hover:text-text transition-colors duration-200 disabled:opacity-30"
          >
            ← {t('clips.previous')}
          </button>
          <span className="font-mono text-xs text-text-dim">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-border text-text-dim font-mono text-xs rounded-lg hover:border-purple hover:text-text transition-colors duration-200 disabled:opacity-30"
          >
            {t('clips.next')} →
          </button>
        </div>
      )}

      {showUpload && (
        <ClipUploadModal
          games={games}
          onClose={() => setShowUpload(false)}
          onSuccess={fetchClips}
        />
      )}
    </div>
  )
}
