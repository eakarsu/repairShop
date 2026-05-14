import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Preventive Care Bundle — given device + repair history, recommend preventive services + bundle pricing.
async function llm(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1200) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503 })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'RepairShop Preventive AI' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku', messages, max_tokens: maxTokens }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || 'LLM error')
  return data.choices?.[0]?.message?.content || ''
}

interface RepairRecord {
  date: string
  serviceCode?: string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { deviceType, brand, model, deviceAgeMonths, repairHistory = [] } = (await request.json()) as {
      deviceType?: string
      brand?: string
      model?: string
      deviceAgeMonths?: number
      repairHistory?: RepairRecord[]
    }
    if (!deviceType) return NextResponse.json({ success: false, error: 'deviceType required' }, { status: 400 })

    const sys = 'You are a service-bundle merchandiser. From device + repair history, recommend 3 preventive services to bundle, expected price range (USD), and the bundle savings narrative. Output JSON.'
    const userMsg = `Device: ${deviceType} ${brand || ''} ${model || ''}\nAgeMonths: ${deviceAgeMonths || 'unknown'}\nHistory: ${JSON.stringify(repairHistory).slice(0, 2500)}`
    const raw = await llm([{ role: 'system', content: sys }, { role: 'user', content: userMsg }], 900)
    return NextResponse.json({ success: true, raw })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ success: false, error: e?.message || 'AI service unavailable' }, { status: e?.status || 500 })
  }
}
