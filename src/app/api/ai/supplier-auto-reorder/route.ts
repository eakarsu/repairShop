import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Parts Supplier Auto-Reorder — monitor inventory, propose POs, suggest alternates if OOS.
// TODO: configure credentials — SUPPLIER_API_KEY, SUPPLIER_BASE_URL.
async function llm(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens = 1500) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503 })
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'RepairShop Supplier AI' },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku', messages, max_tokens: maxTokens }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || 'LLM error')
  return data.choices?.[0]?.message?.content || ''
}

interface Part {
  sku: string
  name: string
  onHand: number
  reorderPoint?: number
  weeklyUsage?: number
  preferredVendorId?: string
  outOfStockAtVendor?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { parts = [], catalogAlternates = [] } = (await request.json()) as {
      parts?: Part[]
      catalogAlternates?: Array<{ sku: string; substituteSkus: string[] }>
    }
    if (!parts.length) return NextResponse.json({ success: false, error: 'parts[] required' }, { status: 400 })

    const lowStock = parts.filter((p) => p.onHand <= (p.reorderPoint ?? 5))
    const sys = 'You are a supplier procurement agent. For each low-stock part, propose: orderQty (3-4 weeks of weeklyUsage), preferredVendor, and if outOfStockAtVendor, propose substitute SKUs from catalogAlternates. Output JSON: { purchaseOrders: [...], substitutions: [...], notes }.'
    const userMsg = `Parts (low): ${JSON.stringify(lowStock)}\nAlternates: ${JSON.stringify(catalogAlternates).slice(0, 2000)}`
    const raw = await llm([{ role: 'system', content: sys }, { role: 'user', content: userMsg }], 1500)

    const supplierReady = !!process.env.SUPPLIER_API_KEY
    return NextResponse.json({
      success: true,
      lowStockCount: lowStock.length,
      raw,
      supplierApiConfigured: supplierReady,
      note: supplierReady ? 'POs can be dispatched' : 'SUPPLIER_API_KEY not set — TODO: configure credentials.',
    })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ success: false, error: e?.message || 'AI service unavailable' }, { status: e?.status || 500 })
  }
}
