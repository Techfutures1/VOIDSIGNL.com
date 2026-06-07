import Link from 'next/link'
import Image from 'next/image'

export interface ClanRankingRowData {
  id: string
  name: string
  slug: string
  avatar_url?: string | null
  xp_total?: number
  member_count?: number
  rank?: number
}

interface ClanRankingRowProps {
  rank: number
  clan: ClanRankingRowData
  /** XP_total van #1 — voor relatieve progressie-bar breedte. */
  maxXp?: number
}

function rankColor(rank: number) {
  if (rank === 1) return '#00C8F0'
  if (rank === 2) return '#9998aa'
  if (rank === 3) return '#6B3FE0'
  return 'rgba(255,255,255,0.25)'
}

export default function ClanRankingRow({ rank, clan, maxXp = 1 }: ClanRankingRowProps) {
  const accent = '#6B3FE0'
  const value = clan.xp_total ?? 0
  const barPct = Math.max(2, Math.round((value / (maxXp || 1)) * 100))
  const members = clan.member_count ?? 0

  return (
    <Link href={`/clans/${clan.slug}`} className="block">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border transition-colors duration-200 hover:bg-surface-2 cursor-pointer">
        {/* Rank */}
        <div
          className="font-mono text-sm font-bold w-7 text-right shrink-0"
          style={{ color: rankColor(rank) }}
        >
          #{rank}
        </div>

        {/* Clan-avatar */}
        <div className="relative shrink-0">
          <div
            className="w-9 h-9 rounded-lg overflow-hidden bg-surface-2 border-2 flex items-center justify-center"
            style={{ borderColor: accent }}
          >
            {clan.avatar_url ? (
              <Image
                src={clan.avatar_url}
                alt={clan.name}
                width={36}
                height={36}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="font-mono text-sm font-bold" style={{ color: accent }}>
                {clan.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold tracking-wide text-white">
              ⬡ {clan.name}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[10px] text-text-muted">
              {members} {members === 1 ? 'lid' : 'leden'}
            </span>
            <div className="w-20 h-0.5 bg-void rounded-full overflow-hidden shrink-0 ml-auto">
              <div
                className="h-full rounded-full"
                style={{ width: `${barPct}%`, background: accent }}
              />
            </div>
          </div>
        </div>

        {/* XP_total */}
        <div className="text-right shrink-0 min-w-[56px]">
          <div className="font-mono text-sm font-bold text-white">
            {value.toLocaleString()}
          </div>
          <div className="font-mono text-[9px] text-text-dim uppercase">XP</div>
        </div>
      </div>
    </Link>
  )
}
