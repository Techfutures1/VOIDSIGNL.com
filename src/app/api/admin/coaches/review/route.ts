import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { coachApplicationReviewSchema } from '@/lib/validations'
import { logApiError } from '@/lib/logError'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    // Admin-check (defense in depth bovenop RLS)
    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = coachApplicationReviewSchema.safeParse(body)
    if (!parsed.success) {
      const reason = parsed.error.flatten().fieldErrors.reason?.[0]
      return NextResponse.json(
        { error: reason ?? 'Controleer je invoer.' },
        { status: 400 },
      )
    }

    const { coach_id, action, reason } = parsed.data

    const patch =
      action === 'approve'
        ? { is_approved: true, is_active: true, rejection_reason: null }
        : { is_approved: false, is_active: false, rejection_reason: reason!.trim() }

    const { data, error } = await supabase
      .from('coach_profiles')
      .update(patch)
      .eq('id', coach_id)
      .select('id, is_approved, is_active, rejection_reason')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Aanvraag niet gevonden of geen rechten.' },
        { status: 404 },
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    await logApiError('/api/admin/coaches/review', 'POST', 500, error)
    console.error('Coach review error:', error)
    return NextResponse.json({ error: 'Er ging iets mis.' }, { status: 500 })
  }
}
