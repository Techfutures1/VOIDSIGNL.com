'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/lib/lang-context'

interface DbStats {
  total_users: number
  active_today: number
  online_now: number
  total_posts: number
  total_clips: number
  total_clans: number
  total_sessions: number
  total_messages: number
  pending_coaches: number
  pending_games: number
  posts_today: number
  clips_today: number
  signups_today: number
  signups_week: number
  active_wars: number
  forum_threads_week: number
}

interface TableSize {
  table_name: string
  row_count: number
  size_bytes: number
  size_pretty: string
}

interface ErrorEntry {
  endpoint: string
  status_code: number
  recorded_at: string
}

interface BucketSummary {
  name: string
  file_count: number
}

interface Metrics {
  db_stats: DbStats
  table_sizes: TableSize[]
  errors_1h: number
  errors_24h: number
  recent_errors: ErrorEntry[]
  storage: BucketSummary[] | null
  online_now: number
  timestamp: string
}

type Status = 'green' | 'orange' | 'red'

function getStatus(value: number, warn: number, critical: number): Status {
  if (value <= warn) return 'green'
  if (value <= critical) return 'orange'
  return 'red'
}

const statusDot: Record<Status, string> = {
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
}

const statusText: Record<Status, string> = {
  green: 'text-success',
  orange: 'text-warning',
  red: 'text-danger',
}

const statusBg: Record<Status, string> = {
  green: 'bg-success/5 border-success/20',
  orange: 'bg-warning/5 border-warning/20',
  red: 'bg-danger/5 border-danger/20',
}

function StatCard({
  label,
  value,
  sub,
  status,
  large,
}: {
  label: string
  value: string | number
  sub?: string
  status?: Status
  large?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        status ? statusBg[status] : 'bg-surface border-border'
      }`}
    >
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">
        {label}
      </p>
      <div className="flex items-end gap-2">
        {status && <span className={`w-2 h-2 rounded-full shrink-0 mb-1 ${statusDot[status]}`} />}
        <p className={`font-mono font-bold ${large ? 'text-3xl' : 'text-2xl'} text-text`}>{value}</p>
      </div>
      {sub && <p className="font-mono text-[10px] text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, status }: { title: string; status?: Status }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {status && <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />}
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-purple">{title}</p>
    </div>
  )
}

export default function SystemMonitorPage() {
  const { t } = useLang()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [alerts, setAlerts] = useState<string[]>([])

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/metrics')
      if (!res.ok) return
      const json = (await res.json()) as Metrics
      setMetrics(json)
      setLastUpdate(new Date())

      const next: string[] = []
      if (json.errors_1h > 50) next.push(`${t('adminMain.alertHighErrorRate')}: ${json.errors_1h} ${t('adminMain.alertErrorsLastHour')}`)
      if (json.errors_24h > 200) next.push(`${json.errors_24h} ${t('adminMain.alertErrorsLast24h')}`)
      if (json.db_stats?.pending_coaches > 10) next.push(`${json.db_stats.pending_coaches} ${t('adminMain.alertCoachRequestsWaiting')}`)
      if (json.db_stats?.pending_games > 20) next.push(`${json.db_stats.pending_games} ${t('adminMain.alertGameRequestsWaiting')}`)
      setAlerts(next)
    } catch (err) {
      console.error('Metrics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30_000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-surface rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-20">
        <p className="font-mono text-xs text-text-muted">{t('adminMain.metricsUnavailable')}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-purple text-white font-mono text-xs rounded-lg hover:bg-purple/85 transition-colors duration-200"
        >
          {t('adminMain.retry')}
        </button>
      </div>
    )
  }

  const errorStatus = getStatus(metrics.errors_1h, 10, 50)
  const errorRate24h =
    metrics.db_stats.total_posts > 0
      ? Math.round((metrics.errors_24h / metrics.db_stats.total_posts) * 1000) / 10
      : 0

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-purple mb-1">{t('adminMain.eyebrowAdmin')}</p>
          <h1 className="font-mono text-2xl font-bold text-text">{t('adminMain.systemMonitorTitle')}</h1>
          {lastUpdate && (
            <p className="font-mono text-[10px] text-text-dim mt-1">
              {t('adminMain.lastUpdate')}: {lastUpdate.toLocaleTimeString('nl-NL')} · {t('adminMain.autoRefresh30s')}
            </p>
          )}
        </div>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 border border-border text-text-muted font-mono text-xs rounded-lg hover:border-purple hover:text-text transition-[border-color,color] duration-200"
        >
          ↻ {t('adminMain.refresh')}
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-danger/8 border border-danger/30 rounded-xl p-4">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-danger mb-3">
            ⚠ {t('adminMain.attentionRequired')}
          </p>
          <div className="space-y-1.5">
            {alerts.map((alert, i) => (
              <p key={i} className="font-mono text-xs text-text-muted">
                → {alert}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Live */}
      <div>
        <SectionHeader title={t('adminMain.sectionLive')} status="green" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t('adminMain.statOnlineNow')}
            value={metrics.online_now}
            sub={t('adminMain.subActiveLast90s')}
            status="green"
            large
          />
          <StatCard
            label={t('adminMain.statActiveToday')}
            value={metrics.db_stats.active_today.toLocaleString()}
            sub={t('adminMain.subLast24h')}
          />
          <StatCard label={t('adminMain.statPostsToday')} value={metrics.db_stats.posts_today.toLocaleString()} />
          <StatCard label={t('adminMain.statClipsToday')} value={metrics.db_stats.clips_today.toLocaleString()} />
        </div>
      </div>

      {/* Platform */}
      <div>
        <SectionHeader title={t('adminMain.sectionPlatform')} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label={t('adminMain.statTotalUsers')} value={metrics.db_stats.total_users.toLocaleString()} />
          <StatCard
            label={t('adminMain.statNewThisWeek')}
            value={metrics.db_stats.signups_week.toLocaleString()}
            sub={`${metrics.db_stats.signups_today} ${t('adminMain.subTodaySuffix')}`}
          />
          <StatCard label={t('adminMain.statTotalPostsSys')} value={metrics.db_stats.total_posts.toLocaleString()} />
          <StatCard label={t('adminMain.statTotalClipsSys')} value={metrics.db_stats.total_clips.toLocaleString()} />
          <StatCard
            label={t('adminMain.statClans')}
            value={metrics.db_stats.total_clans.toLocaleString()}
            sub={`${metrics.db_stats.active_wars} ${t('adminMain.subActiveWars')}`}
          />
          <StatCard
            label={t('adminMain.statCoachingSessions')}
            value={metrics.db_stats.total_sessions.toLocaleString()}
          />
          <StatCard label={t('adminMain.statMessages')} value={metrics.db_stats.total_messages.toLocaleString()} />
          <StatCard
            label={t('adminMain.statForumThreads')}
            value={metrics.db_stats.forum_threads_week.toLocaleString()}
            sub={t('adminMain.subThisWeek')}
          />
        </div>
      </div>

      {/* Openstaande acties */}
      {(metrics.db_stats.pending_coaches > 0 || metrics.db_stats.pending_games > 0) && (
        <div>
          <SectionHeader
            title={t('adminMain.sectionPendingActions')}
            status={
              metrics.db_stats.pending_coaches > 5 || metrics.db_stats.pending_games > 10
                ? 'orange'
                : 'green'
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.db_stats.pending_coaches > 0 && (
              <StatCard
                label={t('adminMain.statCoachRequests')}
                value={metrics.db_stats.pending_coaches}
                sub={t('adminMain.subWaitingApproval')}
                status={metrics.db_stats.pending_coaches > 10 ? 'orange' : 'green'}
              />
            )}
            {metrics.db_stats.pending_games > 0 && (
              <StatCard
                label={t('adminMain.statGameRequests')}
                value={metrics.db_stats.pending_games}
                sub={t('adminMain.subWaitingApproval')}
                status={metrics.db_stats.pending_games > 20 ? 'orange' : 'green'}
              />
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      <div>
        <SectionHeader title={t('adminMain.sectionErrors')} status={errorStatus} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <StatCard
            label={t('adminMain.statErrorsLastHour')}
            value={metrics.errors_1h}
            status={getStatus(metrics.errors_1h, 10, 50)}
            sub={t('adminMain.subErrorsNormal')}
          />
          <StatCard
            label={t('adminMain.statErrorsLast24h')}
            value={metrics.errors_24h}
            status={getStatus(metrics.errors_24h, 50, 200)}
          />
          <StatCard
            label={t('adminMain.statErrorRate')}
            value={`${errorRate24h}%`}
            status={getStatus(errorRate24h, 1, 5)}
            sub={t('adminMain.subErrorRateGreen')}
          />
        </div>

        {metrics.recent_errors.length > 0 && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted">
                {t('adminMain.recentErrors')}
              </p>
            </div>
            <div className="divide-y divide-border max-h-48 overflow-y-auto">
              {metrics.recent_errors.slice(0, 20).map((err, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                  <span
                    className={`font-mono text-xs font-bold shrink-0 ${
                      err.status_code >= 500
                        ? 'text-danger'
                        : err.status_code >= 400
                          ? 'text-warning'
                          : 'text-text-muted'
                    }`}
                  >
                    {err.status_code}
                  </span>
                  <span className="font-mono text-xs text-text-muted flex-1 truncate">
                    {err.endpoint}
                  </span>
                  <span className="font-mono text-[10px] text-text-dim shrink-0">
                    {new Date(err.recorded_at).toLocaleTimeString('nl-NL')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Database */}
      <div>
        <SectionHeader title={t('adminMain.sectionDatabase')} />
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border grid grid-cols-3 gap-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
              {t('adminMain.colTable')}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim text-right">
              {t('adminMain.colRows')}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim text-right">
              {t('adminMain.colSize')}
            </span>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {metrics.table_sizes.map((table) => {
              const sizeMB = table.size_bytes / 1024 / 1024
              const tableStatus: Status = sizeMB > 1000 ? 'red' : sizeMB > 500 ? 'orange' : 'green'
              return (
                <div
                  key={table.table_name}
                  className="grid grid-cols-3 gap-4 px-4 py-2.5 hover:bg-surface-2 transition-colors duration-200"
                >
                  <span className="font-mono text-xs text-text-muted truncate">
                    {table.table_name}
                  </span>
                  <span className="font-mono text-xs text-text text-right">
                    {table.row_count > 1000
                      ? `${(table.row_count / 1000).toFixed(1)}k`
                      : table.row_count.toLocaleString()}
                  </span>
                  <span className={`font-mono text-xs text-right ${statusText[tableStatus]}`}>
                    {table.size_pretty}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Storage */}
      {metrics.storage && metrics.storage.length > 0 && (
        <div>
          <SectionHeader title={t('adminMain.sectionStorageBuckets')} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.storage.map((bucket) => (
              <div key={bucket.name} className="bg-surface border border-border rounded-xl p-4">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2">
                  {bucket.name}
                </p>
                <p className="font-mono text-2xl font-bold text-text">
                  {bucket.file_count.toLocaleString()}
                </p>
                <p className="font-mono text-[10px] text-text-dim mt-1">{t('adminMain.filesLabel')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capaciteit */}
      <div>
        <SectionHeader title={t('adminMain.sectionCapacity')} />
        <div className="space-y-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="font-mono text-xs font-bold text-text">{t('adminMain.vercelHosting')}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="font-mono text-[10px] text-success">{t('adminMain.operational')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {[
                { label: t('adminMain.capServerlessFunctions'), value: t('adminMain.capAutoScaling'), status: 'green' as Status },
                { label: t('adminMain.capCdn'), value: t('adminMain.capWorldwide'), status: 'green' as Status },
                { label: t('adminMain.capDdosBasis'), value: t('adminMain.capBuiltIn'), status: 'green' as Status },
                { label: t('adminMain.capCloudflare'), value: t('adminMain.capSeeInfraChecklist'), status: 'orange' as Status },
                { label: t('adminMain.capRateLimiting'), value: t('adminMain.capInMemoryActive'), status: 'orange' as Status },
                { label: t('adminMain.capUpstashRedis'), value: t('adminMain.capSeeInfraChecklist'), status: 'orange' as Status },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-mono text-[10px] text-text-muted mb-0.5">{item.label}</p>
                  <p className={`font-mono text-xs font-bold ${statusText[item.status]}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="font-mono text-xs font-bold text-text">{t('adminMain.supabaseDatabase')}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="font-mono text-[10px] text-success">{t('adminMain.operational')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: t('adminMain.capRegion'), value: 'eu-central-1' },
                { label: 'PostgreSQL', value: '17.6' },
                { label: 'RLS', value: t('adminMain.capRlsActiveAllTables') },
                { label: t('adminMain.capRealtime'), value: t('adminMain.capActive') },
                { label: t('adminMain.capConnectionPooling'), value: 'PgBouncer' },
                { label: t('adminMain.capBackups'), value: t('adminMain.capSeeInfraChecklist') },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-mono text-[10px] text-text-muted mb-0.5">{item.label}</p>
                  <p className="font-mono text-xs text-text">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-purple/6 border border-purple/20 rounded-xl p-4">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-purple mb-3">
              {t('adminMain.scalabilityEstimate')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  tier: t('adminMain.tierCurrentState'),
                  users: '0 – 10.000',
                  desc: t('adminMain.tierCurrentDesc'),
                  status: 'orange' as Status,
                },
                {
                  tier: t('adminMain.tierGrowthPhase'),
                  users: '10.000 – 100.000',
                  desc: t('adminMain.tierGrowthDesc'),
                  status: 'orange' as Status,
                },
                {
                  tier: t('adminMain.tierScale'),
                  users: '100.000+',
                  desc: t('adminMain.tierScaleDesc'),
                  status: 'red' as Status,
                },
              ].map((tier) => (
                <div key={tier.tier} className={`rounded-lg border p-3 ${statusBg[tier.status]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[tier.status]}`} />
                    <p className="font-mono text-xs font-bold text-text">{tier.tier}</p>
                  </div>
                  <p className="font-mono text-[10px] text-purple mb-1">{tier.users} {t('adminMain.usersSuffix')}</p>
                  <p className="text-text-muted text-xs leading-relaxed">{tier.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance benchmarks */}
      <div>
        <SectionHeader title={t('adminMain.sectionPerformance')} />
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-mono text-[10px] text-text-muted">
              {t('adminMain.thresholdsLabel')}: &lt;500ms {t('adminMain.thresholdGreen')} · 500ms–2s {t('adminMain.thresholdOrange')} · &gt;2s {t('adminMain.thresholdRed')}
            </p>
          </div>
          <div className="divide-y divide-border">
            {[
              { endpoint: 'GET /api/feed', target: '<500ms', note: t('adminMain.notePaginationJoins') },
              { endpoint: 'GET /api/ranking', target: '<300ms', note: t('adminMain.noteDbView') },
              { endpoint: 'GET /api/clips', target: '<400ms', note: t('adminMain.noteThumbnailUrls') },
              { endpoint: 'POST /api/feed', target: '<200ms', note: t('adminMain.noteInsertTrigger') },
              { endpoint: 'GET /api/forums/[slug]', target: '<500ms', note: t('adminMain.noteThreadList') },
              { endpoint: 'GET /api/messages/[id]', target: '<300ms', note: t('adminMain.note50Messages') },
              { endpoint: 'GET /api/games/search', target: '<800ms', note: t('adminMain.noteIgdbExternalApi') },
            ].map((item) => (
              <div
                key={item.endpoint}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2 transition-colors duration-200"
              >
                <span className="font-mono text-xs text-text-muted flex-1 truncate">
                  {item.endpoint}
                </span>
                <span className="font-mono text-xs text-success shrink-0">{item.target}</span>
                <span className="font-mono text-[10px] text-text-dim shrink-0 hidden sm:block">
                  {item.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-dim mb-2">
          {t('adminMain.systemInfo')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('adminMain.supabaseProject'), value: 'dfppzlixnmznlqlmthxy' },
            { label: t('adminMain.vercelProject'), value: 'voidsignl' },
            { label: t('adminMain.framework'), value: 'Next.js 16.2.4' },
            { label: t('adminMain.metricsUpdated'), value: lastUpdate?.toLocaleTimeString('nl-NL') ?? '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-mono text-[10px] text-text-dim mb-0.5">{item.label}</p>
              <p className="font-mono text-[10px] text-text-muted">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
