'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import BuddyCard, { type BuddyCardUser } from '@/components/buddy/BuddyCard'
import BuddyRequestItem, { type BuddyRequestItemData } from '@/components/buddy/BuddyRequestItem'
import { BrandSelect } from '@/components/ui/BrandSelect'
import { useLang } from '@/lib/lang-context'

type Tab = 'zoeken' | 'requests' | 'mijn-buddies'

interface BuddyConv {
  id: string
  status: string
  message: string | null
  created_at: string
  sender: BuddyCardUser
  receiver: BuddyCardUser
}

const PLAYTIMES = ['ochtend', 'middag', 'avond', 'nacht']
const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Mobile']

function BuddiesPageContent() {
  const { t } = useLang()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialGameId = searchParams.get('game') ?? ''
  const [tab, setTab] = useState<Tab>('zoeken')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [results, setResults] = useState<BuddyCardUser[]>([])
  const [requests, setRequests] = useState<BuddyRequestItemData[]>([])
  const [buddies, setBuddies] = useState<BuddyConv[]>([])
  const [games, setGames] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  const [gameId, setGameId] = useState(initialGameId)
  const [language, setLanguage] = useState('')
  const [platform, setPlatform] = useState('')
  const [playtime, setPlaytime] = useState('')
  const [minLevel, setMinLevel] = useState('')
  const [maxLevel, setMaxLevel] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const fetchSearch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(gameId ? { game_id: gameId } : {}),
        ...(language ? { language } : {}),
        ...(platform ? { platform } : {}),
        ...(playtime ? { playtime } : {}),
        ...(minLevel ? { min_level: minLevel } : {}),
        ...(maxLevel ? { max_level: maxLevel } : {}),
      })
      const res = await fetch(`/api/buddy/search?${params}`)
      const json = await res.json()
      setResults(json.data ?? [])
      if (json.games) setGames(json.games)
    } finally {
      setLoading(false)
    }
  }, [gameId, language, platform, playtime, minLevel, maxLevel])

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/buddy?type=received')
    const json = await res.json()
    setRequests(json.data ?? [])
  }, [])

  const fetchBuddies = useCallback(async () => {
    const res = await fetch('/api/buddy?type=accepted')
    const json = await res.json()
    setBuddies(json.data ?? [])
  }, [])

  useEffect(() => {
    if (tab === 'zoeken') fetchSearch()
    if (tab === 'requests') fetchRequests()
    if (tab === 'mijn-buddies') fetchBuddies()
  }, [tab, fetchSearch, fetchRequests, fetchBuddies])

  async function handleRequest(userId: string, message: string) {
    await fetch('/api/buddy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: userId, message }),
    })
  }

  async function handleRespond(requestId: string, action: 'accept' | 'decline') {
    await fetch('/api/buddy/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action }),
    })
    setRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'zoeken', label: t('buddies.tab_search') },
    { key: 'requests', label: `${t('buddies.tab_requests')}${requests.length > 0 ? ` (${requests.length})` : ''}` },
    { key: 'mijn-buddies', label: t('buddies.tab_my_buddies') },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-1">
          {t('buddies.eyebrow')}
        </p>
        <h1 className="font-mono text-3xl font-bold text-text mb-1">{t('buddies.title')}</h1>
        <p className="text-text-dim text-sm">{t('buddies.subtitle')}</p>
      </div>

      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-colors duration-200 ${
              tab === t.key ? 'bg-purple text-white' : 'text-text-dim hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'zoeken' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <BrandSelect
              value={gameId}
              onChange={setGameId}
              searchable
              placeholder={t('buddies.filter_all_games')}
              options={[
                { value: '', label: t('buddies.filter_all_games') },
                ...games.map(g => ({ value: g.id, label: g.name })),
              ]}
            />
            <BrandSelect
              value={language}
              onChange={setLanguage}
              placeholder={t('buddies.filter_all_languages')}
              options={[
                { value: '', label: t('buddies.filter_all_languages') },
                { value: 'nl', label: 'Nederlands' },
                { value: 'en', label: 'English' },
              ]}
            />
            <BrandSelect
              value={platform}
              onChange={setPlatform}
              placeholder={t('buddies.filter_all_platforms')}
              options={[
                { value: '', label: t('buddies.filter_all_platforms') },
                ...PLATFORMS.map(p => ({ value: p, label: p })),
              ]}
            />
            <BrandSelect
              value={playtime}
              onChange={setPlaytime}
              placeholder={t('buddies.filter_all_times')}
              options={[
                { value: '', label: t('buddies.filter_all_times') },
                ...PLAYTIMES.map(pt => ({ value: pt, label: t(`buddies.playtime_${pt}`) })),
              ]}
            />
            <BrandSelect
              value={minLevel}
              onChange={setMinLevel}
              placeholder={t('buddies.filter_min_level')}
              options={[
                { value: '', label: t('buddies.filter_min_level') },
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => ({
                  value: String(l),
                  label: `${t('buddies.level')} ${l}`,
                })),
              ]}
            />
            <BrandSelect
              value={maxLevel}
              onChange={setMaxLevel}
              placeholder={t('buddies.filter_max_level')}
              options={[
                { value: '', label: t('buddies.filter_max_level') },
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => ({
                  value: String(l),
                  label: `${t('buddies.level')} ${l}`,
                })),
              ]}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-surface rounded-xl h-48" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[10px] tracking-[0.2em] text-text-dim/60 uppercase mb-3">
                {t('buddies.empty_search_title')}
              </p>
              <p className="text-text-dim text-sm">
                {t('buddies.empty_search_desc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map(user => (
                <BuddyCard
                  key={user.id}
                  user={user}
                  onRequest={handleRequest}
                  onAccept={(requestId) => handleRespond(requestId, 'accept')}
                  onDecline={(requestId) => handleRespond(requestId, 'decline')}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-[10px] tracking-[0.2em] text-text-dim/60 uppercase mb-3">
                {t('buddies.empty_label')}
              </p>
              <p className="text-text-dim text-sm">{t('buddies.empty_requests_desc')}</p>
            </div>
          ) : (
            requests.map(r => (
              <BuddyRequestItem
                key={r.id}
                request={r}
                onAccept={(id) => handleRespond(id, 'accept')}
                onDecline={(id) => handleRespond(id, 'decline')}
              />
            ))
          )}
        </div>
      )}

      {tab === 'mijn-buddies' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {buddies.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <p className="font-mono text-[10px] tracking-[0.2em] text-text-dim/60 uppercase mb-3">
                {t('buddies.empty_label')}
              </p>
              <p className="text-text-dim text-sm">
                {t('buddies.empty_buddies_desc')}
              </p>
            </div>
          ) : (
            buddies.map(b => {
              // De "andere" partij bepalen
              const buddy = b.sender?.id === currentUserId ? b.receiver : b.sender
              if (!buddy) return null
              return <BuddyCard key={b.id} user={{ ...buddy, is_buddy: true }} />
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function BuddiesPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse h-12 bg-surface rounded-xl" /></div>}>
      <BuddiesPageContent />
    </Suspense>
  )
}
