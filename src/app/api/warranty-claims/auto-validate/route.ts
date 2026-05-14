// Auto warranty claim validator.
// PRODUCT-DECISION: simple rule set —
//   1. Device must be within warranty window (default 12 months from purchase / createdAt).
//   2. Issue must not be in the EXCLUDED_CAUSES list (water, drop, accidental).
//   3. Customer must not have > MAX_PRIOR_CLAIMS prior approved claims in 12mo (default 3).
// Override via env WARRANTY_WINDOW_MONTHS, WARRANTY_EXCLUDED_CAUSES (CSV),
// WARRANTY_MAX_PRIOR_CLAIMS.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const WINDOW_MONTHS = Number(process.env.WARRANTY_WINDOW_MONTHS || '12')
const EXCLUDED = (process.env.WARRANTY_EXCLUDED_CAUSES || 'water,drop,accidental,physical_damage').split(',')
const MAX_PRIOR = Number(process.env.WARRANTY_MAX_PRIOR_CLAIMS || '3')

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { deviceCreatedAt, issueCause, priorApprovedClaims = 0 } = await request.json()
    if (!deviceCreatedAt || !issueCause) {
      return NextResponse.json({ error: 'deviceCreatedAt and issueCause required' }, { status: 400 })
    }
    const ageMonths = (Date.now() - new Date(deviceCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    const reasons: string[] = []
    if (ageMonths > WINDOW_MONTHS) reasons.push(`Device age ${ageMonths.toFixed(1)}mo > warranty window ${WINDOW_MONTHS}mo`)
    if (EXCLUDED.some((e) => String(issueCause).toLowerCase().includes(e))) reasons.push(`Issue cause "${issueCause}" is excluded by policy`)
    if (priorApprovedClaims >= MAX_PRIOR) reasons.push(`Prior approved claims ${priorApprovedClaims} >= ${MAX_PRIOR}`)

    const decision = reasons.length === 0 ? 'auto_approve' : 'manual_review'
    return NextResponse.json({
      decision,
      reasons,
      policy: { window_months: WINDOW_MONTHS, excluded_causes: EXCLUDED, max_prior_claims: MAX_PRIOR },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
