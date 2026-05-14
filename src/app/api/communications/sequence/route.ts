// Customer communications sequence engine.
// PRODUCT-DECISION: a built-in 3-step "ticket lifecycle" sequence:
//   day 0: confirmation
//   day 2: progress check
//   day 5: pickup reminder
// Override the schedule via env COMM_SEQUENCE_DAYS (CSV, e.g. "0,3,7"). The
// endpoint computes the schedule for a given startedAt timestamp; actual
// dispatch (Twilio/SendGrid) gated on those env vars.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const DAYS = (process.env.COMM_SEQUENCE_DAYS || '0,2,5').split(',').map((d) => Number(d))
const STEPS = [
  { name: 'confirmation', subject: 'Repair ticket received', body: 'We received your repair ticket and will be in touch shortly.' },
  { name: 'progress', subject: 'Repair update', body: 'Your repair is in progress; we will notify you when it is ready.' },
  { name: 'pickup_reminder', subject: 'Repair complete — pickup', body: 'Your device is ready for pickup at the shop.' },
]

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { startedAt = new Date().toISOString(), customerName = 'Customer' } = await request.json().catch(() => ({}))
    const start = new Date(startedAt).getTime()

    const schedule = STEPS.map((step, idx) => {
      const dayOffset = DAYS[idx] ?? STEPS.length + idx
      const at = new Date(start + dayOffset * 86400 * 1000).toISOString()
      return {
        step: step.name,
        scheduledAt: at,
        subject: step.subject,
        body: `Hi ${customerName}, ${step.body}`,
      }
    })

    return NextResponse.json({
      schedule,
      providers_required: ['Twilio (SMS) or SendGrid (email)'],
      note: 'Dispatch is gated on the corresponding integration env vars.',
    })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
