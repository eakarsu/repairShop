// SendGrid email customer communications.
// Required env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missing = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'].filter((k) => !process.env[k])
  if (missing.length) {
    return NextResponse.json(
      {
        error: 'SendGrid not configured',
        missing: missing.join(', '),
        configure: 'Set SendGrid env vars to enable customer email.',
      },
      { status: 503 }
    )
  }

  try {
    const { to, subject, body } = await request.json()
    if (!to || !subject || !body) return NextResponse.json({ error: 'to, subject, body required' }, { status: 400 })
    return NextResponse.json({ ok: true, provider: 'sendgrid', to, simulated: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
