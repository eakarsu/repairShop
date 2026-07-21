// Stripe payments for repairShop POS / repair invoices.
// Required env: STRIPE_SECRET_KEY
// Returns 503 if not configured.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error: 'Stripe not configured',
        missing: 'STRIPE_SECRET_KEY',
        configure: 'Set STRIPE_SECRET_KEY to enable payment processing.',
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { amount, currency = 'usd', description } = body || {}
    if (!amount) return NextResponse.json({ error: 'amount required' }, { status: 400 })
    void currency
    void description
    return NextResponse.json({ error: 'Stripe adapter is not implemented; no payment was created' }, { status: 501 })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
