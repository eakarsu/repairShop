// Live parts supplier integration (Mouser / Digi-Key).
// Required env: SUPPLIER_PROVIDER (mouser|digikey), SUPPLIER_API_KEY
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const missing = ['SUPPLIER_PROVIDER', 'SUPPLIER_API_KEY'].filter((k) => !process.env[k])
  if (missing.length) {
    return NextResponse.json(
      {
        error: 'Parts supplier not configured',
        missing: missing.join(', '),
        configure: 'Set SUPPLIER_PROVIDER (mouser/digikey) and SUPPLIER_API_KEY to enable live supplier search.',
      },
      { status: 503 }
    )
  }

  try {
    const { partNumber } = await request.json()
    if (!partNumber) return NextResponse.json({ error: 'partNumber required' }, { status: 400 })
    void partNumber
    return NextResponse.json({ error: 'Parts supplier adapter is not implemented; no supplier search ran' }, { status: 501 })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
