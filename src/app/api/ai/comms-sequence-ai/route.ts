import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Customer Communications Automation (AI sequence) — ticket-status SMS, invoice email, follow-up survey.
// TODO: configure credentials — TWILIO_AUTH_TOKEN, SENDGRID_API_KEY for actual dispatch.
async function llm(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1200) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503 })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'RepairShop Comms AI' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku', messages, max_tokens: maxTokens }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || 'LLM error')
  return data.choices?.[0]?.message?.content || ''
}

type Stage = 'check-in' | 'in-progress' | 'ready-for-pickup' | 'completed' | 'followup'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { ticketId, stage, customerName, brandTone = 'friendly' } = (await request.json()) as {
      ticketId?: string
      stage?: Stage
      customerName?: string
      brandTone?: string
    }
    if (!ticketId || !stage) return NextResponse.json({ success: false, error: 'ticketId and stage required' }, { status: 400 })

    const sys = `You are a customer comms drafter for a repair shop. Tone: ${brandTone}. Produce SMS (<=160 chars) and email (subject + 2-paragraph body) tailored to the stage. Output JSON: { sms, email: { subject, body }, suggestSurvey: boolean }.`
    const userMsg = `Ticket: ${ticketId}\nCustomer: ${customerName || 'guest'}\nStage: ${stage}`
    const raw = await llm([{ role: 'system', content: sys }, { role: 'user', content: userMsg }], 800)

    const dispatchReady = !!(process.env.TWILIO_AUTH_TOKEN && process.env.SENDGRID_API_KEY)
    return NextResponse.json({ success: true, raw, dispatchReady })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ success: false, error: e?.message || 'AI service unavailable' }, { status: e?.status || 500 })
  }
}
