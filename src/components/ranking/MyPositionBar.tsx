import { getNextLevel } from '@/lib/levels'
import { useLang } from '@/lib/lang-context'

interface MyPositionBarProps {
  rank: number
  totalRanks?: number
  user: {
    username: string
    level_name: string
    xp: number
    achievement_count?: number
  }
  nextRankUsername?: string
  nextRankXp?: number | null
}

export default function MyPositionBar({
  rank,
  user,
  nextRankXp,
}: MyPositionBarProps) {
  const { t } = useLang()
  const nextLevel = getNextLevel(user.level_name)
  const xpToNextRank =
    nextRankXp != null ? Math.max(0, nextRankXp - user.xp + 1) : null

  return (
    <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-void/95 border border-purple/35 flex-wrap gap-3">
      {/* Positie */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
          {t('rankingUi.yourPosition')}
        </span>
        <span className="font-mono text-xl font-bold text-text">#{rank}</span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-5 flex-wrap">
        <div>
          <p className="font-mono text-[9px] text-text-dim uppercase tracking-widest mb-0.5">
            {t('rankingUi.level')}
          </p>
          <p className="font-mono text-xs text-text-muted">{user.level_name}</p>
        </div>

        <div>
          <p className="font-mono text-[9px] text-text-dim uppercase tracking-widest mb-0.5">
            XP
          </p>
          <p className="font-mono text-sm font-bold text-text">
            {user.xp.toLocaleString()}
            {nextLevel && (
              <span className="font-normal text-[10px] text-text-dim ml-1">
                / {nextLevel.minXp.toLocaleString()} {t('rankingUi.next')}
              </span>
            )}
          </p>
        </div>

        {(user.achievement_count ?? 0) > 0 && (
          <div>
            <p className="font-mono text-[9px] text-text-dim uppercase tracking-widest mb-0.5">
              {t('rankingUi.badgesLabel')}
            </p>
            <p className="font-mono text-xs text-purple">
              {user.achievement_count} {t('rankingUi.unlocked')}
            </p>
          </div>
        )}

        {xpToNextRank !== null && rank > 1 && (
          <div>
            <p className="font-mono text-[9px] text-text-dim uppercase tracking-widest mb-0.5">
              {t('rankingUi.toRank')} #{rank - 1}
            </p>
            <p className="font-mono text-xs text-text-muted">
              {xpToNextRank.toLocaleString()} XP
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
