import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Symptom-to-Root-Cause Agent — multi-turn diagnosis with parts list.
async function llm(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1500) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503 })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'RepairShop Pro Extras' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku', messages, max_tokens: maxTokens }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || 'LLM error')
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { deviceType, brand, model, symptoms = [], conversationHistory = [] } = await request.json()
    if (!deviceType || !(symptoms || []).length) {
      return NextResponse.json({ success: false, error: 'deviceType and symptoms[] required' }, { status: 400 })
    }

    const sys = 'You are a senior diagnostician. From symptoms + device, list ranked root causes, parts likely needed (with part-type), estimated repair-time bands, and 3 clarifying questions to ask the customer. Output JSON.'
    const user1 = `Device: ${deviceType} ${brand || ''} ${model || ''}\nSymptoms: ${symptoms.join('; ')}\nConversation so far: ${JSON.stringify(conversationHistory).slice(0, 2000)}`
    const raw = await llm([{ role: 'system', content: sys }, { role: 'user', content: user1 }], 1500)
    return NextResponse.json({ success: true, raw })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ success: false, error: e?.message || 'AI service unavailable' }, { status: e?.status || 500 })
  }
}
