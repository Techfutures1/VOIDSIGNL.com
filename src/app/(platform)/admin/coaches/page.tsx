'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-browser'
import { ArrowLeft, Shield, Check, X, Loader2 } from 'lucide-react'

interface CoachRow {
  id: string
  bio: string
  specializations: string[]
  languages: string[]
  hourly_tier: string
  is_approved: boolean
  applied_at: string | null
  rejection_reason: string | null
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    level_name: string | null
    xp: number
  } | null
  games: { game: { id: string; name: string } }[]
}

type Tab = 'pending' | 'approved' | 'rejected'

function isRejected(c: CoachRow) {
  return !c.is_approved && !!c.rejection_reason?.trim()
}

export default function AdminCoachesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [pending, setPending] = useState<CoachRow[]>([])
  const [approved, setApproved] = useState<CoachRow[]>([])
  const [rejected, setRejected] = useState<CoachRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Afwijs-modal
  const [rejectFor, setRejectFor] = useState<CoachRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { checkAccess() }, [])

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (!profile || profile.role !== 'admin') {
      router.push('/admin')
      return
    }
    setAuthorized(true)
    fetchCoaches()
  }

  async function fetchCoaches() {
    setLoading(true)
    const { data } = await supabase
      .from('coach_profiles')
      .select(`
        id, bio, specializations, languages, hourly_tier,
        is_approved, applied_at, rejection_reason,
        user:profiles!coach_profiles_user_id_fkey(
          id, username, display_name, avatar_url, level_name, xp
        ),
        games:coach_games(game:games(id, name))
      `)
      .order('applied_at', { ascending: true })

    const list = (data ?? []) as unknown as CoachRow[]
    setPending(list.filter(c => !c.is_approved && !isRejected(c)))
    setApproved(list.filter(c => c.is_approved))
    setRejected(list.filter(isRejected))
    setLoading(false)
  }

  /** Stuurt approve/reject naar de server-route. Geeft true terug bij succes. */
  async function review(coachId: string, action: 'approve' | 'reject', reason?: string) {
    setActionId(coachId)
    setError('')
    try {
      const res = await fetch('/api/admin/coaches/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coachId, action, reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Actie mislukt.')
      await fetchCoaches()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis.')
      return false
    } finally {
      setActionId(null)
    }
  }

  async function submitReject() {
    if (!rejectFor) return
    const ok = await review(rejectFor.id, 'reject', rejectReason)
    if (ok) {
      setRejectFor(null)
      setRejectReason('')
    }
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-dim text-sm animate-pulse">Toegang controleren...</div>
      </div>
    )
  }

  const list = tab === 'pending' ? pending : tab === 'approved' ? approved : rejected

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-text-dim hover:text-text mb-3">
          <ArrowLeft size={12} /> Terug naar Admin
        </Link>
        <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-1">Admin</p>
        <h1 className="text-xl font-semibold tracking-wide flex items-center gap-2">
          <Shield size={20} className="text-purple" /> Coach aanvragen
        </h1>
      </div>

      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 max-w-md">
        {([
          { key: 'pending', label: `Wachtend (${pending.length})` },
          { key: 'approved', label: `Actief (${approved.length})` },
          { key: 'rejected', label: `Afgewezen (${rejected.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg font-mono text-xs transition-colors duration-200 ${
              tab === t.key ? 'bg-purple text-white' : 'text-text-dim hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl h-32" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-dim font-mono text-sm">Geen aanvragen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(coach => {
            const busy = actionId === coach.id
            const rej = isRejected(coach)
            return (
              <div key={coach.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-2 flex-shrink-0">
                    {coach.user?.avatar_url ? (
                      <Image src={coach.user.avatar_url} alt={coach.user.username}
                        fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-mono text-sm text-text-dim">
                          {coach.user?.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-bold text-text">
                        {coach.user?.display_name ?? coach.user?.username}
                      </span>
                      <span className="font-mono text-[10px] text-text-dim">
                        {coach.user?.level_name} · {coach.user?.xp?.toLocaleString()} XP
                      </span>
                    </div>

                    <p className="text-text-dim text-xs leading-relaxed mb-3 line-clamp-3">
                      {coach.bio}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {coach.games?.map((cg, idx) => (
                        <span key={cg.game?.id ?? idx}
                          className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-surface-2 text-text-dim">
                          {cg.game?.name}
                        </span>
                      ))}
                      {coach.specializations?.map(s => (
                        <span key={s}
                          className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-purple/10 border border-purple/20 text-purple">
                          {s}
                        </span>
                      ))}
                    </div>

                    <p className="font-mono text-[10px] text-text-dim/60">
                      Aangemeld: {coach.applied_at ? new Date(coach.applied_at).toLocaleDateString('nl-NL') : '—'}
                      {rej && ` · Afgewezen: ${coach.rejection_reason}`}
                    </p>
                  </div>

                  {!coach.is_approved && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => review(coach.id, 'approve')}
                        disabled={busy}
                        className="px-4 py-2 bg-success text-white font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-success/85 transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Goedkeuren
                      </button>
                      {!rej && (
                        <button
                          onClick={() => { setRejectFor(coach); setRejectReason(''); setError('') }}
                          disabled={busy}
                          className="px-4 py-2 border border-danger text-danger font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-danger/10 transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <X size={12} /> Afwijzen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Branded afwijs-modal — vervangt de native prompt() */}
      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-void/95"
            onClick={() => !actionId && setRejectFor(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-0.5">Coach aanvraag</p>
              <h2 className="font-mono text-lg font-bold text-text">
                {rejectFor.user?.display_name ?? rejectFor.user?.username} afwijzen
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="reject-reason"
                  className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted block mb-2"
                >
                  Reden voor afwijzing
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Wordt zichtbaar voor de aanvrager..."
                  rows={3}
                  maxLength={300}
                  autoFocus
                  className="w-full bg-void border border-border rounded-lg px-4 py-3 text-text text-sm font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors resize-none"
                />
                <p className="font-mono text-[10px] text-text-dim/60 mt-1 text-right">
                  {rejectReason.length}/300
                </p>
              </div>

              {error && (
                <p className="font-mono text-xs text-danger">{error}</p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectFor(null)}
                  disabled={!!actionId}
                  className="px-4 py-2 border border-border text-text-dim font-mono text-xs uppercase tracking-wider rounded-lg hover:border-purple hover:text-text transition-colors duration-200 disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  disabled={rejectReason.trim().length < 2 || !!actionId}
                  className="px-4 py-2 bg-danger text-white font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-danger/85 transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionId ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  Afwijzen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
