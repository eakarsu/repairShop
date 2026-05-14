// QuickBooks accounting integration.
// Required env: QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REALM_ID
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missing = ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET', 'QUICKBOOKS_REALM_ID'].filter(
    (k) => !process.env[k]
  )
  if (missing.length) {
    return NextResponse.json(
      {
        error: 'QuickBooks not configured',
        missing: missing.join(', '),
        configure: 'Set QuickBooks env vars to enable accounting sync.',
      },
      { status: 503 }
    )
  }

  try {
    const { entity, payload } = await request.json()
    if (!entity) return NextResponse.json({ error: 'entity required' }, { status: 400 })
    return NextResponse.json({ ok: true, provider: 'quickbooks', entity, simulated: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
