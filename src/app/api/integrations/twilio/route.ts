// Twilio SMS for customer comm.
// Required env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missing = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'].filter(
    (k) => !process.env[k]
  )
  if (missing.length) {
    return NextResponse.json(
      {
        error: 'Twilio not configured',
        missing: missing.join(', '),
        configure: 'Set Twilio env vars to enable customer SMS.',
      },
      { status: 503 }
    )
  }

  try {
    const { to, body } = await request.json()
    if (!to || !body) return NextResponse.json({ error: 'to and body required' }, { status: 400 })
    return NextResponse.json({ ok: true, provider: 'twilio', to, simulated: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
