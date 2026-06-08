'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

interface InvitePayload {
  id: string
  code: string
  max_uses: number
  uses: number
  expires_at: string | null
  expired: boolean
  exhausted: boolean
  clan: {
    id: string
    slug: string
    name: string
    description?: string | null
    avatar_url?: string | null
    banner_url?: string | null
    member_count: number
    max_members: number
    is_open: boolean
  } | null
}

export default function InviteLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { t } = useLang()
  const router = useRouter()
  const [invite, setInvite] = useState<InvitePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/invites/${code}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(t('invite.notFound'))
        else setInvite(j.data)
      })
      .catch(() => setError(t('invite.loadFailed')))
      .finally(() => setLoading(false))
  }, [code])

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      const res = await fetch(`/api/invites/${code}/accept`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? t('invite.joinFailed'))
        return
      }
      router.push(`/clans/${json.slug}`)
    } catch {
      setError(t('invite.joinFailed'))
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="animate-pulse bg-surface rounded-2xl h-72" />
      </div>
    )
  }

  if (!invite || !invite.clan) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-mono text-[10px] tracking-[0.2em] text-danger uppercase mb-3">
          {t('invite.invalidLink')}
        </p>
        <h1 className="font-mono text-2xl font-bold text-text mb-3">
          {t('invite.linkNoLongerWorks')}
        </h1>
        <p className="text-text-dim text-sm mb-8">
          {error || t('invite.linkRemoved')}
        </p>
        <Link
          href="/clans"
          className="px-6 py-3 bg-purple text-white font-mono text-sm rounded-lg hover:bg-purple/85 transition-colors"
        >
          {t('invite.viewAllClans')}
        </Link>
      </div>
    )
  }

  const clan = invite.clan
  const blocked = invite.expired || invite.exhausted

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="relative h-32 bg-void">
          {clan.banner_url && (
            <Image src={clan.banner_url} alt="" fill className="object-cover opacity-60" />
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="relative -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-surface bg-surface-2 overflow-hidden">
              {clan.avatar_url ? (
                <Image src={clan.avatar_url} alt={clan.name} width={80} height={80} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-2xl text-text-dim">
                  {clan.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <p className="font-mono text-[10px] tracking-[0.2em] text-purple uppercase mb-1">
            {t('invite.youAreInvited')}
          </p>
          <h1 className="font-mono text-2xl font-bold text-text mb-2">{clan.name}</h1>

          {clan.description && (
            <p className="text-text-dim text-sm mb-4 leading-relaxed line-clamp-3">
              {clan.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-text-dim font-mono text-xs mb-6">
            <span>{clan.member_count}/{clan.max_members} {t('invite.members')}</span>
            <span>{clan.is_open ? t('invite.open') : t('invite.inviteOnly')}</span>
          </div>

          {blocked ? (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg mb-4">
              <p className="font-mono text-xs text-danger">
                {invite.expired ? t('invite.linkExpired') : t('invite.linkMaxedOut')}
              </p>
            </div>
          ) : null}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg mb-4">
              <p className="font-mono text-xs text-danger">{error}</p>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={joining || blocked}
            className="w-full py-3 bg-purple text-white font-mono text-sm uppercase tracking-wider rounded-lg hover:bg-purple/85 transition-colors disabled:opacity-40"
          >
            {joining ? t('invite.joining') : t('invite.joinClan')}
          </button>

          <Link
            href={`/clans/${clan.slug}`}
            className="block text-center mt-3 font-mono text-xs text-text-dim hover:text-text transition-colors"
          >
            {t('invite.viewClanFirst')} →
          </Link>
        </div>
      </div>
    </div>
  )
}
