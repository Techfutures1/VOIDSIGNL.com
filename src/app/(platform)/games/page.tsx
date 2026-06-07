'use client'

import { useState, useEffect } from 'react'
import GameCard, { type GameCardData } from '@/components/games/GameCard'
import GameSearchModal from '@/components/games/GameSearchModal'
import { useLang } from '@/lib/lang-context'

interface LibEntry {
  id: string
  rank: string | null
  is_main: boolean
  game: GameCardData
}

export default function GamesPage() {
  const { t } = useLang()
  const [games, setGames] = useState<GameCardData[]>([])
  const [userGames, setUserGames] = useState<LibEntry[]>([])
  const [userGameIds, setUserGameIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [sort, setSort] = useState('players')

  useEffect(() => {
    Promise.all([
      fetch(`/api/games?sort=${sort}`).then(r => r.json()),
      fetch('/api/games/library').then(r => r.json()),
    ]).then(([allGames, library]) => {
      setGames(allGames.data ?? [])
      const lib = (library.data ?? []) as LibEntry[]
      setUserGames(lib)
      setUserGameIds(new Set(lib.map(ug => ug.game?.id).filter(Boolean) as string[]))
    }).finally(() => setLoading(false))
  }, [sort])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-1">
            {t('games.eyebrow')}
          </p>
          <h1 className="font-mono text-3xl font-bold text-text mb-1">{t('games.title')}</h1>
          <p className="text-text-dim text-sm">{games.length} {t('games.available')}</p>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="px-5 py-2.5 bg-purple text-white font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-purple/85 transition-colors"
        >
          {t('games.requestGame')}
        </button>
      </div>

      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6 max-w-xs">
        {[
          { key: 'players', label: t('games.sortPlayers') },
          { key: 'name', label: t('games.sortName') },
          { key: 'newest', label: t('games.sortNewest') },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`flex-1 py-2 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-colors duration-200 ${
              sort === s.key ? 'bg-purple text-white' : 'text-text-dim hover:text-text'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl aspect-[3/4]" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-mono text-[10px] tracking-[0.2em] text-text-dim/60 uppercase mb-3">{t('games.emptyEyebrow')}</p>
          <p className="text-text-dim text-sm">{t('games.emptyMessage')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {games.map(game => {
            const ug = userGames.find(u => u.game?.id === game.id)
            return (
              <GameCard
                key={game.id}
                game={game}
                userRank={ug?.rank ?? null}
                isInLibrary={userGameIds.has(game.id)}
              />
            )
          })}
        </div>
      )}

      {showSearch && (
        <GameSearchModal
          onSelect={() => setShowSearch(false)}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
