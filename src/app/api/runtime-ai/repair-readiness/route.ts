import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const input = await request.json().catch(() => ({}))
  const prompt = String(input?.prompt || input?.query || '').trim()
  if (!prompt || prompt.length > 8000) return NextResponse.json({ error: 'Prompt must contain 1-8000 characters' }, { status: 400 })
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL
  const baseUrl = process.env.OPENROUTER_BASE_URL
  if (!apiKey || !model || baseUrl !== 'https://openrouter.ai/api/v1') return NextResponse.json({ error: 'Canonical OpenRouter configuration is required' }, { status: 503 })

  const provider = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.2, messages: [
      { role: 'system', content: 'Review a governed repair-shop workflow. Return concise safety and operational risks, evidence gaps, next actions, uncertainty, and decisions requiring qualified human technician approval.' },
      { role: 'user', content: prompt },
    ] }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!provider.ok) return NextResponse.json({ error: `OpenRouter returned ${provider.status}` }, { status: 502 })
  const payload = await provider.json()
  const content = String(payload?.choices?.[0]?.message?.content || '').trim()
  const receipt = String(payload?.id || provider.headers.get('x-request-id') || '').trim()
  if (!content || !receipt) return NextResponse.json({ error: 'OpenRouter returned an incomplete response' }, { status: 502 })
  const result = await prisma.runtimeAiResult.create({
    data: { userId: user.id, feature: 'repair-readiness', prompt, content, provider: 'openrouter', model, providerResponseId: receipt },
    select: { id: true },
  })
  return NextResponse.json({ id: result.id, content, provider: 'openrouter', model, providerReceipt: { id: receipt } })
}
