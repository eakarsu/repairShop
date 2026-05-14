import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Technician Dispatch Optimizer — assign tickets to technicians by skill/load.
async function llm(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1500) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503 })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'RepairShop Dispatch AI' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku', messages, max_tokens: maxTokens }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || 'LLM error')
  return data.choices?.[0]?.message?.content || ''
}

interface TicketLite {
  id: string
  deviceType?: string
  estimatedMinutes?: number
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  requiredSkills?: string[]
}
interface TechnicianLite {
  id: string
  name?: string
  skills?: string[]
  currentLoadMinutes?: number
  available?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { tickets = [], technicians = [] } = (await request.json()) as {
      tickets?: TicketLite[]
      technicians?: TechnicianLite[]
    }
    if (!tickets.length || !technicians.length) {
      return NextResponse.json({ success: false, error: 'tickets[] and technicians[] required' }, { status: 400 })
    }

    const sys = 'You are a dispatch optimizer. Assign each ticket to the best technician (skill match, available, balanced load). Output JSON: { assignments: [{ ticketId, technicianId, estimatedStart, rationale }], unassigned: [...], notes }.'
    const userMsg = `Tickets: ${JSON.stringify(tickets).slice(0, 4000)}\nTechnicians: ${JSON.stringify(technicians).slice(0, 4000)}`
    const raw = await llm([{ role: 'system', content: sys }, { role: 'user', content: userMsg }], 1800)
    return NextResponse.json({ success: true, raw })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ success: false, error: e?.message || 'AI service unavailable' }, { status: e?.status || 500 })
  }
}
