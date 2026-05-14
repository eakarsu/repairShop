import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Smart Warranty Claim Processing — vision/text intake, auto-validate, explain.
async function llm(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1500) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503 })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'RepairShop Warranty AI' },
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

    const { claimDescription, purchaseDate, warrantyTermMonths, attachedPhotos = [], serialNumber } = await request.json()
    if (!claimDescription) return NextResponse.json({ success: false, error: 'claimDescription required' }, { status: 400 })

    const purchase = purchaseDate ? new Date(purchaseDate) : null
    const monthsSince = purchase ? (Date.now() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 30.4) : null
    const inTerm = warrantyTermMonths != null && monthsSince != null ? monthsSince <= Number(warrantyTermMonths) : null

    const sys = 'You are a warranty claim adjudicator. Given description (+ photo count) decide: approve | request_more_info | deny. Explain in plain English. Output JSON: { decision, reasoning, missingInfo: [...], estimatedReplacementCostUSD }.'
    const userMsg = `Claim: ${claimDescription}\nSerial: ${serialNumber || 'n/a'}\nPurchase date: ${purchaseDate || 'n/a'} (in warranty: ${inTerm})\nPhotos attached: ${attachedPhotos.length}`
    const raw = await llm([{ role: 'system', content: sys }, { role: 'user', content: userMsg }], 1200)
    return NextResponse.json({ success: true, monthsSince, inTerm, raw })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ success: false, error: e?.message || 'AI service unavailable' }, { status: e?.status || 500 })
  }
}
