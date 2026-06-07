// Vertaalt Supabase-auth-fouten naar humane Nederlandse meldingen.
// Nooit rauwe technische tekst of een 500-bericht naar de gebruiker tonen
// (huisregel §8): de gebruiker krijgt rust, het technische detail gaat naar console/Sentry.

export type AuthErrorKind =
  | 'network' // server onbereikbaar / offline / 5xx
  | 'credentials' // verkeerd e-mailadres of wachtwoord
  | 'unconfirmed' // e-mail nog niet bevestigd
  | 'rate_limited' // te veel pogingen
  | 'exists' // account bestaat al
  | 'weak_password'
  | 'generic'

export interface MappedAuthError {
  kind: AuthErrorKind
  message: string
  /** Of een "opnieuw proberen"-knop zinvol is (tijdelijke fout). */
  retryable: boolean
}

interface ErrorLike {
  name?: string
  status?: number
  code?: string
  message?: string
}

/**
 * Map een onbekende fout (van supabase-js of een gegooide exception) naar
 * een vaste Nederlandse melding + categorie.
 */
export function mapAuthError(error: unknown): MappedAuthError {
  const e = (error ?? {}) as ErrorLike
  const msg = (e.message ?? '').toLowerCase()
  const status = typeof e.status === 'number' ? e.status : 0
  const code = e.code ?? ''

  // Offline (browser weet het zeker)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      kind: 'network',
      message: 'Je lijkt offline. Controleer je internetverbinding en probeer het opnieuw.',
      retryable: true,
    }
  }

  // Onbereikbare server / netwerkfout uit supabase-js
  const isNetwork =
    e.name === 'AuthRetryableFetchError' ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed')

  // 5xx of generieke serverfout (bijv. gepauzeerde/herstartende database)
  const isServer =
    status >= 500 ||
    code === 'unexpected_failure' ||
    msg.includes('database error')

  if (isNetwork || isServer) {
    return {
      kind: 'network',
      message: 'De server is even niet bereikbaar. Probeer het zo opnieuw.',
      retryable: true,
    }
  }

  if (status === 429 || code === 'over_request_rate_limit' || msg.includes('rate limit')) {
    return {
      kind: 'rate_limited',
      message: 'Te veel pogingen. Wacht even en probeer het daarna opnieuw.',
      retryable: true,
    }
  }

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return {
      kind: 'credentials',
      message: 'E-mailadres of wachtwoord klopt niet.',
      retryable: false,
    }
  }

  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return {
      kind: 'unconfirmed',
      message:
        'Bevestig eerst je e-mailadres. Check je inbox voor de bevestigingslink.',
      retryable: false,
    }
  }

  if (
    code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('user already registered')
  ) {
    return {
      kind: 'exists',
      message: 'Er bestaat al een account met dit e-mailadres. Log in.',
      retryable: false,
    }
  }

  if (
    code === 'weak_password' ||
    (msg.includes('password') &&
      (msg.includes('should be') ||
        msg.includes('at least') ||
        msg.includes('weak') ||
        msg.includes('pwned') ||
        msg.includes('leaked')))
  ) {
    return {
      kind: 'weak_password',
      message:
        'Dit wachtwoord is te zwak of komt voor in een bekend datalek. Kies een sterker wachtwoord.',
      retryable: false,
    }
  }

  // Onverwacht — geen rauwe tekst tonen.
  return {
    kind: 'generic',
    message: 'Er ging iets mis. Probeer het opnieuw.',
    retryable: true,
  }
}
